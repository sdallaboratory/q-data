import { Job } from "bullmq";
import _ from "lodash";
import moment from "moment";
import { firstValueFrom, of, mergeMap, map, bufferCount, mergeWith, filter, tap, reduce, bufferTime, mergeAll, from } from "rxjs";
import { inject } from "tsyringe";
import { GroupsGroup, UsersFields, UsersUserFull1 } from "vk-io/lib/api/schemas/objects";
import { GroupsGetMembersFieldsResponse } from "vk-io/lib/api/schemas/responses";
import { environment } from "../../../../shared/environment";
import { User } from "../../../../shared/models/entities/user";
import { Group } from "../../../../shared/models/entities/group";
import { VkCollectGroupsMembersParams } from "../../../../shared/models/tasks/vk-collect-groups-members/vk-collect-groups-members-params";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { isNotNill } from "../../../../shared/utils/is-not-nill";
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
export class VkCollectGroupsMembers extends JobDbProcessorExecutor<VkCollectGroupsMembersJob> {

    private readonly BMSTU_ID = 250;

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

    anonimizeUsers<T extends object>(user: T) {
        return _.omit(user, ['last_name', 'first_name', 'can_access_closed'])
    };

    stampAge<T extends { bdate?: string }>(user: T) {
        if (!user.bdate) {
            return user;
        }
        const regex = /^(?<day>[0-3]?\d?).(?<month>[01]?\d?)(?<year>.?([12]\d\d\d))?$/;
        const groups = regex.exec(user.bdate)?.groups || {};
        const { year, month, day } = groups;
        if (!year || !month || !day) {
            return user;
        }
        return {
            ...user,
            bdate: {
                year: Number(year),
                age: moment().diff(`${year}-${month}-${day}`, 'years'),
            }
        }
    };

    stampRelevance(user: Partial<User>) {
        const problems = [] as string[];
        if (!user.universities?.some(({ id }) => id === this.BMSTU_ID)) {
            problems.push('Указаны университеты, но среди них нет МГТУ')
        }
        const graduationYear = 2020;
        if (user.graduation && user.graduation < graduationYear) {
            problems.push(`Год выпуска менее ${graduationYear}-го`);
        }
        const birthYear = 1995;
        if (user.bdate && user.bdate.year < birthYear) {
            problems.push(`Год рождения менее ${birthYear}`);
        }
        if (user.country?.id !== 1) {
            problems.push(`В качестве страны указана не Россия`);
        }
        return problems.length ? { ...user, problems } : user;
    }

    async process() {
        this.log(`Collecting groups members from vk...`);
        
        const groupsCollection = await this.mongo.getCollection<Group>(this.params.mongo.db, this.params.mongo.groupsCollection);
        const cacheCollection = await this.mongo.getCollection<Partial<User>>(this.params.mongo.db, this.params.mongo.membersCacheCollection);
        const membersCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCollection);

        const groups = await groupsCollection.find({
            stopWords: { $exists: false },
        }).map(({ id, name, members_count }) => ({ id, name, members_count }))
        .toArray()
        this.log(JSON.stringify(groups));

        this.log(`Fetched ${groups.length} vk groups from database...`);
        await this.reportProgress(5);


        const params = _.flatMap(groups, group => _.chain(group.members_count / 1000)
            .ceil()
            .range()
            .map(offset => offset * 1000)
            .map(offset => ({ ...group, count: 1000, offset }))
            .slice(this.params.groups.skip)
            .take(this.params.groups.limit)
            .value()
        );

        this.log(`${params.length} requests to vk API are needed to collect all members...`);
        await this.reportProgress(10);

        const writesToMembersCache: Promise<unknown>[] = [];

        const users = await firstValueFrom(
            from(params).pipe(
                bufferCount(this.params.groups.bufferCount),
                mergeMap(async params => zipShortest(
                    params,
                    await this.vkApi.callButch('groups', 'getMembers', params.map(
                        group => ({
                            ...group,
                            group_id: String(group.id),
                            fields: this.fields
                        }),
                    )) as Array<GroupsGetMembersFieldsResponse | boolean>,
                ), environment.CONCURRENCY_FACTOR),
                mergeAll(),
                filter(([group, response]) => Boolean(response)), // Because of "Access denied: group hide members" error,
                map(([group, s]) => ({ ...s as GroupsGetMembersFieldsResponse, group })),
                mergeMap(({ items, group }) => items.map(user => ({ ...user as User, group }))),
            ).pipe(
                map(user => this.anonimizeUsers(user)),
                map(user => this.stampAge(user)),
                map(user => this.stampRelevance(user)),
                map(user => this.stampId(user)),
                map(user => this.stampMeta(user)),
            ).pipe(
                bufferTime(3000),
                filter(arr => Boolean(arr.length)),
                tap(users => writesToMembersCache.push(cacheCollection.insertMany(users, { ordered: false })
                    .then(() => this.log(`New portion of ${users.length} user was succesfully saved`)))),
                reduce((acc, users) => [...acc, ...users]),
            ),
        );

        await Promise.all(writesToMembersCache);
        // TODO: Split processor into several little jobs (or at least preserve results in DB)

        await this.reportProgress(90);
        this.log(`Totally collected ${users.length} users. Merging duplicated users...`);

        // function mapLodash<TInput, TOutput>(projection: (chain: LoDashExplicitWrapper<TInput>) => LoDashExplicitWrapper<TOutput>) {
        //     return map((value: TInput) => projection(_.chain(value)).value());
        // }

        const uniqUsers = await firstValueFrom(
            of(
                await cacheCollection.find().toArray() as typeof users,
            ).pipe(
                map(users => _(users)
                    .groupBy(user => user.id)
                    .toPairs()
                    .map(([id, [user, ...copies]]) => ({
                        ...user,
                        group: [user, ...copies].map(({ group }) => group).filter(isNotNill),
                    }))
                    .orderBy(user => user.group.length)
                    .value()
                ),
                mapArray(group => this.stampId(group)),
                mapArray(group => this.stampMeta(group)),
            ),
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