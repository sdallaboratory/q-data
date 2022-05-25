import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, of, mergeMap, map, bufferCount, filter, tap, reduce, bufferTime, mergeAll, from, zip, merge } from "rxjs";
import { inject } from "tsyringe";
import { UsersUserFull1 } from "vk-io/lib/api/schemas/objects";
import { environment } from "../../../../shared/environment";
import { User } from "../../../../shared/models/entities/user";
import { VkCollectFriendsParams } from "../../../../shared/models/tasks/vk-collect-friends/vk-collect-friends-params";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { zipShortest } from "../../../../shared/utils/zip-shortest";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobDbProcessorExecutor } from "../job-db-processor";
import { JobProcessor } from "../registry/job-processor.decorator";

// TODO: Solve problem with this type at "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job"
export type VkCollectFriendsJob = Job<VkCollectFriendsParams, void, 'vk-collect-groups-members'>;

@JobProcessor({
    taskName: 'vk-collect-friends',
    defaultParams: vkCollectGroupsDefaultParams,
})
export class VkCollectFriends extends JobDbProcessorExecutor<VkCollectFriendsJob> {

    constructor(
        @inject(Job) protected readonly job: VkCollectFriendsJob,
        protected readonly vkApi: VkApiService,
        protected readonly mongo: MongoService,
    ) {
        super(job, mongo);
    }

    async process() {
        this.log(`Collecting users friends from vk...`);

        const membersCollection = await this.mongo.getCollection<User>(this.params.mongo.db, this.params.mongo.membersCollection);
        const cacheCollection = await this.mongo.getCollection<User>(this.params.mongo.db, this.params.mongo.usersCacheCollection);
        const usersCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.usersCollection);

        const users = membersCollection.find({ is_closed: 0 });

        const writesToUsersCache = [] as Promise<unknown>[];

        const withFriends = await firstValueFrom(
            from(users).pipe(
                bufferCount(this.params.members.bufferCount),
                mergeMap(async users => zipShortest(
                    users,
                    await this.vkApi.callButch('friends', 'get', users.map(u => ({ user_id: u.id, count: 1000, offset: 0 })))
                ), environment.CONCURRENCY_FACTOR),
                tap(pairs => this.log(`Collectd friends for users: ${pairs.map(([user]) => user.id).join(', ')}`)),
                mergeAll(),
                map(([user, { count, items }]) => ({ ...user, friends: { count, ids: items } })),
                bufferTime(5000),
                filter(users => Boolean(users.length)),
                tap(users => cacheCollection.insertMany(users, { ordered: false })),
                mergeAll(),
            ).pipe(
                map(user => this.stampId(user)),
                map(user => this.stampMeta(user)),
                bufferCount(Infinity),
            ),
        )

        await Promise.all(writesToUsersCache);

        await this.reportProgress(90);
        this.log(`Totally collected friends for ${withFriends} users. Saving to db...`);

        const usersIds = new Set(await membersCollection.find().map(u => u.id).toArray());
        this.log(`There are ${usersIds} known user ids...`);

        const withKnownFriends = await firstValueFrom(
            from(cacheCollection.find()).pipe(
                map(user => ({ ...user, links: user.friends?.ids.filter(id => usersIds.has(id)) })),
                map(user => this.stampId(user)),
                map(user => this.stampMeta(user)),
                bufferCount(Infinity),
            ),
        );

        await this.reportProgress(95);

        this.log(`Successfully collected ${withKnownFriends.length} users from VK.`);

        this.log(`Writing groups members to database...`);
        try {
            await usersCollection.insertMany(withKnownFriends, { ordered: false });
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