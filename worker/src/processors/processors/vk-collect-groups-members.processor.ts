import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, mergeMap, map, bufferCount, filter, tap, reduce, bufferTime, mergeAll, from } from "rxjs";
import { inject, injectable } from "tsyringe";
import { UsersFields } from "vk-io/lib/api/schemas/objects";
import { GroupsGetMembersFieldsResponse } from "vk-io/lib/api/schemas/responses";
import { environment } from "../../../../shared/environment";
import { CachedMember, User } from "../../../../shared/models/entities/user";
import { Group } from "../../../../shared/models/entities/group";
import { zipShortest } from "../../../../shared/utils/zip-shortest";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobDbProcessor } from "../job-db-processor";
import { VkCollectGroupsMembersParams } from "../../../../shared/models/tasks/params/vk-collect-groups-members-default-params";

type VkCollectGroupsMembersJob = Job<VkCollectGroupsMembersParams, void, 'vk-merge-groups-members'>;

@injectable()
export class VkCollectGroupsMembers extends JobDbProcessor<VkCollectGroupsMembersJob> {

    private readonly fields = [
        'education',
        'universities',
        'sex',
        'bdate',
        'last_seen',
        'city',
        'country',
        'home_town',
        'status',
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

    async process() {
        this.log(`Collecting groups members from vk...`);

        const groupsCollection = await this.mongo.getCollection<Group>(this.params.mongo.db, this.params.mongo.groupsCollection);
        const cacheCollection = await this.mongo.getCollection<Partial<CachedMember>>(this.params.mongo.db, this.params.mongo.membersCacheCollection);

        let groups = await groupsCollection.find({
            stopWords: { $exists: false },
        }).map(({ id, name, members_count }) => ({ id, name, members_count }))
            .toArray();

        this.log(`Fetched ${groups.length} vk groups from database...`);
        await this.reportProgress(5);
        
        const alreadyProcessedGroups = new Set(await cacheCollection.find().map(g => g.group?.id).toArray());
        this.log(`There are ${alreadyProcessedGroups.size} vk groups are already processed. They will be skipped`);
        await this.reportProgress(10);
        
        groups = groups.filter(g => !alreadyProcessedGroups.has(g.id))
        this.log(`So ${groups.length} vk groups will be processd.`);
        await this.reportProgress(15);

        const params = _.flatMap(groups, group => _.chain(group.members_count / 1000)
            .ceil()
            .range()
            .map(offset => offset * 1000)
            .map(offset => ({ ...group, count: 1000, offset }))
            .slice(this.params.groups.skip)
            .take(this.params.groups.limit)
            .value()
        );

        this.log(`${params.length} requests to vk API left to collect all members...`);
        await this.reportProgress(20);

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
                map(user => this.stampId(user)),
                map(user => this.stampMeta(user)),
            ).pipe(
                bufferTime(3000),
                filter(arr => Boolean(arr.length)),
                tap(users => writesToMembersCache.push(cacheCollection.insertMany(users, { ordered: false })
                    .then(() => this.log(`New portion of ${users.length} user was succesfully saved`))
                    .catch((e: Error) => this.log('An error occured while writing users to database', e.message))
                )),
                reduce((acc, users) => [...acc, ...users]),
            ),
        );

        await Promise.all(writesToMembersCache);
        // TODO: Split processor into several little jobs (or at least preserve results in DB)

        await this.reportProgress(100);
        this.log(`Totally collected ${users.length} users.`);
    }

    async dispose() {
        await Promise.all([
            this.vkApi.dispose(),
            this.mongo.dispose(),
        ]);
    }
}