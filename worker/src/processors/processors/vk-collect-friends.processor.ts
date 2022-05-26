import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, mergeMap, map, bufferCount, filter, tap, bufferTime, mergeAll, from } from "rxjs";
import { inject } from "tsyringe";
import { environment } from "../../../../shared/environment";
import { User } from "../../../../shared/models/entities/user";
import { VkCollectFriendsParams } from "../../../../shared/models/tasks/params/vk-collect-friends-default-params";
import { zipShortest } from "../../../../shared/utils/zip-shortest";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobDbProcessor } from "../job-db-processor";

type VkCollectFriendsJob = Job<VkCollectFriendsParams, void, 'vk-collect-groups-members'>;

export class VkCollectFriends extends JobDbProcessor<VkCollectFriendsJob> {

    constructor(
        @inject(Job) protected readonly job: VkCollectFriendsJob,
        protected readonly vkApi: VkApiService,
        protected readonly mongo: MongoService,
    ) {
        super(job, mongo);
    }

    async process() {
        this.log(`Preparing for collecting users friends from vk...`);

        const membersCollection = await this.mongo.getCollection<User>(this.params.mongo.db, this.params.mongo.membersCollection);
        const usersCollection = await this.mongo.getCollection<User>(this.params.mongo.db, this.params.mongo.usersCollection);

        const users = await membersCollection.find({ is_closed: false, problems: { $exists: false } })
            .skip(this.params.members.skip)
            .limit(this.params.members.limit)
            .toArray();

        this.log(`${users.length} users fetched from the database to request their friends from VK API.`);

        const writesToUsersCache = [] as Promise<unknown>[];

        const alreadyProcessed = new Set(await usersCollection.find().map(user => user.id).toArray());
        this.log(`${alreadyProcessed.size} users will be skipped as they already has friends collected.`);
        this.log(`${Math.ceil((users.length - alreadyProcessed.size) / this.params.members.bufferCount)} requests to VK API left totally to collect friends.`);

        const usersIds = new Set(await membersCollection.find().map(u => u.id).toArray());
        this.log(`There are ${usersIds.size} known user ids (collected users)...`);

        this.log(`Starting collecting users' friends from vk...`);
        const withFriends = await firstValueFrom(
            from(users).pipe(
                filter(({ id }) => !alreadyProcessed.has(id)),
                bufferCount(this.params.members.bufferCount),
                mergeMap(async users => zipShortest(
                    users,
                    await this.vkApi.callButch('friends', 'get', users.map(u => ({ user_id: u.id, count: 1000, offset: 0 })))
                ), environment.CONCURRENCY_FACTOR),
                mergeAll(),
                map(([user, { count, items }]) => ({
                    ...user, friends: {
                        count,
                        unknown: items?.filter(id => !usersIds.has(id)),
                        ids: items?.filter(id => usersIds.has(id)),
                    }
                })),
            ).pipe(
                bufferTime(5000),
                filter(users => Boolean(users.length)),
                tap(users => writesToUsersCache.push(
                    usersCollection.insertMany(users, { ordered: false })
                        .then(() => this.log(`Friends for ${users.length} users more were saved to database`))
                        .catch((e: Error) => this.log('An error occured while writing users to database', e.message))
                )),
                mergeAll(),
                map(user => this.stampId(user)),
                map(user => this.stampMeta(user)),
                bufferCount(Infinity),
            ),
        );

        await Promise.all(writesToUsersCache);

        await this.reportProgress(100);
        this.log(`Totally collected ${withFriends.length} users from VK. Job finished.`);
    }

    async dispose() {
        await Promise.all([
            this.vkApi.dispose(),
            this.mongo.dispose(),
        ]);
    }
}