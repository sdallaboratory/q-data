import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, mergeMap, map, bufferCount, filter, tap, bufferTime, mergeAll, from } from "rxjs";
import { inject, injectable } from "tsyringe";
import { environment } from "../../../../shared/environment";
import { User } from "../../../../shared/models/entities/user";
import { BuildGraphParams } from "../../../../shared/models/tasks/params/build-graph-default-params";
import { zipShortest } from "../../../../shared/utils/zip-shortest";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobDbProcessor } from "../job-db-processor";

type BuildGraphJob = Job<BuildGraphParams, void, 'vk-collect-groups-members'>;

@injectable()
export class BuildGraph extends JobDbProcessor<BuildGraphJob> {

    constructor(
        @inject(Job) protected readonly job: BuildGraphJob,
        protected readonly mongo: MongoService,
    ) {
        super(job, mongo);
    }

    private readonly idsRegistry = new Map<any, number>()
    anonimizeId(id: any) {
        return this.idsRegistry.get(id) ?? this.idsRegistry.set(id, _.random(0, Number.MAX_SAFE_INTEGER)).get(id)!;
    }

    private readonly sexMap = {
        0: 'не указан',
        1: 'женский',
        2: 'мужской',
    } as const;

    private readonly BMSTU_ID = 250;

    async process() {
        this.log(`Preparing for collecting users friends from vk...`);

        const membersCollection = await this.mongo.getCollection<User>(this.params.mongo.db, this.params.mongo.membersCollection); // Without friends
        const usersCollection = await this.mongo.getCollection<User>(this.params.mongo.db, this.params.mongo.usersCollection); // Only not closed profiles with with friends

        const users = await membersCollection.find().toArray();
        const withFriends = await usersCollection.find().toArray();

        const map = new Map(withFriends.map(f => [f.id, f] as const));

        const nodes = users.map(({ id, city, country, bdate, sex, group, universities, }) => ({
            id,
            geo: { country, city },
            demo: {
                ...(typeof bdate === 'string' ? {} : bdate),
                sex: this.sexMap[sex],
            },
            universities: universities?.map(u => _.pick(u, ...[
                'id',
                'name',
                'graduation',
                'education_status',
                'chair',
                'faculty',
                'chair_name',
                'faculty_name',
            ])),
            group: group.map(({ id, name }) => ({ id, name })),
        }));

        // links = _(users)
        //     .map((user) => user.friends.ids?.map((id) => [user.id, id]) || [])
        //     .flatten()
        //     .filter((pair) => pair.every((id) => ids.has(id)))
        //     .map(_.orderBy)
        //     .uniqBy(_.join)
        //     .orderBy(_.first)
        //     .map(([source, target]) => ({ source, target }))
        //     .value()

        this.log(`${users.length} users fetched from the database to request their friends from VK API.`);

        // const writesToUsersCache = [] as Promise<unknown>[];

        // const alreadyProcessed = new Set(await usersCollection.find().map(user => user.id).toArray());
        // this.log(`${alreadyProcessed.size} users will be skipped as they already has friends collected.`);
        // this.log(`${Math.ceil((users.length - alreadyProcessed.size) / this.params.members.bufferCount)} requests to VK API left totally to collect friends.`);

        // const usersIds = new Set(await membersCollection.find().map(u => u.id).toArray());
        // this.log(`There are ${usersIds.size} known user ids (collected users)...`);

        // this.log(`Starting collecting users' friends from vk...`);
        // const withFriends = await firstValueFrom(
        //     from(users).pipe(
        //         filter(({ id }) => !alreadyProcessed.has(id)),
        //         bufferCount(this.params.members.bufferCount),
        //         mergeMap(async users => zipShortest(
        //             users,
        //             await this.vkApi.callButch('friends', 'get', users.map(u => ({ user_id: u.id, count: 1000, offset: 0 })))
        //         ), environment.CONCURRENCY_FACTOR),
        //         mergeAll(),
        //         map(([user, { count, items }]) => ({
        //             ...user, friends: {
        //                 count,
        //                 unknown: items?.filter(id => !usersIds.has(id)),
        //                 ids: items?.filter(id => usersIds.has(id)),
        //             }
        //         })),
        //     ).pipe(
        //         bufferTime(5000),
        //         filter(users => Boolean(users.length)),
        //         tap(users => writesToUsersCache.push(
        //             usersCollection.insertMany(users, { ordered: false })
        //                 .then(() => this.log(`Friends for ${users.length} users more were saved to database`))
        //                 .catch((e: Error) => this.log('An error occured while writing users to database', e.message))
        //         )),
        //         mergeAll(),
        //         map(user => this.stampId(user)),
        //         map(user => this.stampMeta(user)),
        //         bufferCount(Infinity),
        //     ),
        // );

        // await Promise.all(writesToUsersCache);

        await this.reportProgress(100);
        this.log(`Totally collected ${withFriends.length} users from VK. Job finished.`);
    }

    async dispose() {
        await this.mongo.dispose();
    }
}