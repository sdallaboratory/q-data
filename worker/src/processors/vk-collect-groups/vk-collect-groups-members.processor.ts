import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, of, mergeMap, map, bufferCount, mergeWith, filter, tap, reduce, bufferTime } from "rxjs";
import { inject } from "tsyringe";
import { GroupsGroup, UsersFields, UsersUserFull1 } from "vk-io/lib/api/schemas/objects";
import { GroupsGetMembersFieldsResponse, GroupsGetMembersResponse } from "vk-io/lib/api/schemas/responses";
import { VkCollectGroupsMembersParams } from "../../../../shared/models/tasks/vk-collect-groups-members/vk-collect-groups-members-params";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { flatten } from "../../../../shared/utils/rxjs/operators/flatten";
import { mapArray } from "../../../../shared/utils/rxjs/operators/map-array";
import { zipShortest } from "../../../../shared/utils/zip-shortest";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobDbProcessorExecutor } from "../job-db-processor";
import { JobProcessor } from "../registry/job-processor.decorator";

// TODO: Solve problem with this type at "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job"
export type VkCollectGroupsMembersJob = Job<VkCollectGroupsMembersParams, void, 'vk-collect-groups-members'>;

@JobProcessor({
    taskName: 'vk-collect-groups-members',
    defaultParams: vkCollectGroupsDefaultParams,
})
export class VkCollectGroups extends JobDbProcessorExecutor<VkCollectGroupsMembersJob> {

    private readonly fields = [
        'education',
        'universities',
        'sex',
        'bdate',
        'last_seen',
        'city',
        'country',
        'home_town',
    ] as UsersFields[];

    constructor(
        @inject(Job) protected readonly job: VkCollectGroupsMembersJob,
        protected readonly vkApi: VkApiService,
        protected readonly mongo: MongoService,
    ) {
        super(job, mongo);
    }

    anonimizeUsers(user: any) {
        return _.omit(user, ['last_name', 'first_name', 'can_access_closed'])
    };

    parseDate<T extends { bdate?: string }>(user: T) {
        if (!user.bdate) {
            return user;
        }
        const regex = /^(?<day>[0-3]?\d?).(?<month>[01]?\d?)(?<year>.?([12]\d\d\d))?$/;
        const groups = regex.exec(user.bdate)?.groups;
        if (!groups) {
            return user;
        }
        return {
            ...user,
            bdate: {
                ..._.mapValues(groups, Number),
            }
        }
    };

    async process() {
        this.log(`Collecting groups members from vk...`);
        type Document = GroupsGroup & { id: number; stopWords?: string[] }; // TODO: Move it to separate files

        const groupsCollection = await this.mongo.getCollection<Document>(this.params.mongo.db, this.params.mongo.groupsCollection);
        const cacheCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCacheCollection);
        const membersCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCollection);

        const groups = await groupsCollection.find({
            stopWords: null,
            is_closed: 0
        }).map(({ id, name }) => ({ id, name })).toArray();

        this.log(`There is ${groups.length} vk groups in database...`);
        await this.reportProgress(10);

        const groupsMembersCounts = await firstValueFrom(
            of(...groups).pipe(
                bufferCount(25),
                mergeMap(async groups => zipShortest(
                    groups,
                    await this.vkApi.callButch('groups', 'getMembers',
                        groups.map(({ id }) => ({
                            group_id: String(id),
                            count: 1000,
                            fields: this.fields,
                            offset: 0
                        }))) as Array<GroupsGetMembersFieldsResponse | boolean>
                ), 5),
                tap(responses => this.log('Collected data for groups: ', responses.map(([group]) => group.name).join(', '))),
                flatten(),
                filter(([group, response]) => Boolean(response)), // Because of "Access denied: group hide members" error,
                map(([group, response]) => ({ ...response as GroupsGetMembersFieldsResponse, group })),
                bufferCount(Infinity),
            ),
        );


        await this.reportProgress(20);
        // const col = await this.save(groupsCounts);
        // this.log(col);

        const params = _.flatMap(groupsMembersCounts, group => _.range(1, Math.ceil(group.count / 1000))
            .map(offset => offset * 1000)
            .map(offset => ({ ...group, count: 1000, offset, }))
        );

        // await this.save(params);

        this.log(`${params.length} requests to vk API are left to collect all members...`);
        await this.reportProgress(25);

        const writes: Promise<unknown>[] = [];

        const users = await firstValueFrom(
            of(...params).pipe(
                bufferCount(25),
                mergeMap(async params => zipShortest(
                    params,
                    await this.vkApi.callButch('groups', 'getMembers', params.map(
                        ({ count, offset, group }) => ({
                            count,
                            offset,
                            group_id: String(group.id),
                            fields: this.fields
                        }),
                    )) as Array<GroupsGetMembersFieldsResponse | boolean>,
                ), 10),
                flatten(),
                filter(([params, response]) => Boolean(response)), // Because of "Access denied: group hide members" error,
                map(([{ group }, s]) => ({ ...s as GroupsGetMembersFieldsResponse, group })),
            ).pipe(
                mergeWith(of(...groupsMembersCounts)), // Add results of earlier requests
                mergeMap(({ items, group }) => items.map(user => ({ ...user as Partial<UsersUserFull1 & { id: number }>, group }))),
                map(user => this.anonimizeUsers(user)),
                map(user => this.parseDate(user)),
                map(user => this.stampId(user)),
                map(user => this.stampMeta(user)),
                bufferCount(1000),
                tap(users => writes.push(cacheCollection.insertMany(users, { ordered: false })
                    .then(() => this.log('New portion of', users.length, 'user was succesfully saved')))),
                reduce((acc, users) => [...acc, ...users]),
            )
        );

        await Promise.all(writes);
        // TODO: Split processor into several little jobs (or at least preserve results in DB)

        await this.reportProgress(90);
        this.log(`Totally collected ${users.length} users. Merging duplicated users...`);

        const uniqUsers = await firstValueFrom(
            of(
                ...await membersCollection.find().toArray() as typeof users,
            ).pipe(
                map(users => _(users)
                    .groupBy((user: typeof users) => user.id)
                    .toPairs()
                    .map(([id, [user, ...copies]]) => ({
                        ...user,
                        groups: [user, ...copies].map(({ group }) => group),
                    }))
                    .value()
                ),
                mapArray(group => this.stampId(group)),
                mapArray(group => this.stampMeta(group)),
            )
        );

        await this.reportProgress(95);


        this.log(`Successfully collected ${uniqUsers.length} users from VK.`);


        this.log(`Writing groups members to database...`);
        try {
            await membersCollection.insertMany(uniqUsers, { ordered: false });
            this.log(`Successfully wrote vk groups members to databse.`);
            await this.reportProgress(100);
        } catch (e) {
            const message = `An error occured while writing. It seems some data was already in the databse.`;
            this.log(message);
            throw new Error(message);
        }
    }

    async dispose() {
        await Promise.all([
            this.vkApi.dispose(),
            this.mongo.dispose(),
        ]);
    }
}