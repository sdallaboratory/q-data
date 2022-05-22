import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, of, mergeMap, map, bufferCount, mergeWith, filter, tap } from "rxjs";
import { inject } from "tsyringe";
import { GroupsGroup, UsersFields, UsersUserFull1 } from "vk-io/lib/api/schemas/objects";
import { GroupsGetMembersFieldsResponse, GroupsGetMembersResponse } from "vk-io/lib/api/schemas/responses";
import { log } from "../../../../shared/logger/log";
import { VkCollectGroupsMembersParams } from "../../../../shared/models/tasks/vk-collect-groups-members/vk-collect-groups-members-params";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { mapArray } from "../../../../shared/utils/rxjs/operators/map-array";
import { zipShortest } from "../../../../shared/utils/zip";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobProcessorExecutor } from "../job-processor";
import { JobProcessor } from "../registry/job-processor.decorator";

// TODO: Solve problem with this type at "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job"
export type VkCollectGroupsMembersJob = Job<VkCollectGroupsMembersParams, void, 'vk-collect-groups-members'>;


@JobProcessor({
    taskName: 'vk-collect-groups-members',
    defaultParams: vkCollectGroupsDefaultParams,
})
export class VkCollectGroups extends JobProcessorExecutor<VkCollectGroupsMembersJob> {

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
        super();
    }

    // private async save<T extends object>(docs: T[]) {
    //     const cacheCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCacheCollection);
    //     const membersCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCollection);
    //     const cache = await membersCollection.find().toArray();
    //     await cacheCollection.drop()
    //     await cacheCollection.insertMany(cache);
    //     await membersCollection.drop();
    //     await membersCollection.insertMany(docs);
    // }

    async process() {
        this.log(`Collecting groups members from vk...`);
        type Document = GroupsGroup & { id: number; valid: boolean }; // TODO: Move it to separate files
        const groupsCollection = await this.mongo.getCollection<Document>(this.params.mongo.db, this.params.mongo.groupsCollection);
        const cacheCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCacheCollection);

        const groupsIds = await groupsCollection.find({ valid: true }).map(doc => doc.id).toArray();

        this.log(`There is ${groupsIds.length} groups in database vk...`);
        await this.reportProgress(10);

        const groupsCounts = await firstValueFrom(
            of(...groupsIds).pipe(
                bufferCount(25),
                mergeMap(async ids => zipShortest(
                    ids,
                    await this.vkApi.callButch('groups', 'getMembers',
                        ids.map(id => ({ group_id: String(id), count: 1000, fields: this.fields }))) as Array<GroupsGetMembersFieldsResponse | boolean>
                ), 10),
                mergeMap(pairs => of(...pairs)),
                filter(([id, response]) => Boolean(response)), // Because of "Access denied: group hide members" error,
                map(([id, response]) => ({ ...response as GroupsGetMembersFieldsResponse, id })),
                bufferCount(Infinity),
            ),
        );

        
        await this.reportProgress(20);
        
        const params = _(groupsCounts)
        .flatMap((group) => _.range(1, Math.ceil(group.count / 1000)).map(o => o * 1000).map(offset => ({ ...group, count: 1000, offset, })))
        .value();
        
        // await cacheCollection.drop();
        // await cacheCollection.insertMany(groupsCounts); // TODO: Set up using cache collections
        
        this.log(`${params.length} requests to vk API are left to collect all members...`);
        await this.reportProgress(25);

        const writes: Promise<unknown>[] = [];

        const users = await firstValueFrom(
            of(...params).pipe(
                bufferCount(25),
                mergeMap(async params => zipShortest(
                    params,
                    await this.vkApi.callButch('groups', 'getMembers', params.map(
                        ({ count, offset, id }) => ({ count, offset, group_id: String(id), fields: this.fields }),
                    )) as Array<GroupsGetMembersFieldsResponse | boolean>,
                ), 10),
                tap(responses => writes.push(cacheCollection.insertMany(
                    responses.map(([params, response]) => ({ params, response })
                )).then(r => this.log(r.insertedCount, 'items was saved to cache collection in a database')))),
                mergeMap(pairs => of(...pairs)),
                filter(([{ id }, response]) => Boolean(response)), // Because of "Access denied: group hide members" error,
                map(([{ id }, s]) => ({ ...s as GroupsGetMembersFieldsResponse, id })),
                mergeWith(of(...groupsCounts)),
                mergeMap(group => group.items.map(user => ({ ...user as Partial<UsersUserFull1 & { id: number }>, group: group.id }))),
                bufferCount(Infinity),
            )
        );

        await Promise.all(writes);
        // TODO: Split processor into several little jobs (or at least preserve results in DB)

        await this.reportProgress(90);
        this.log(`Totally collected ${users.length} users. Preparing users to write into a database...`);

        const uniqUsers = await firstValueFrom(
            of(users).pipe(
                map(users => _(users)
                    .groupBy(user => user.id)
                    .toPairs()
                    .map(([id, userCopies]) => ({ id: userCopies[0].id, groups: userCopies.map(({ group }) => group) }))
                    .value()
                ),
                mapArray(group => this.stampId(group)),
                mapArray(group => this.stampMeta(group)),
            ));

        await this.reportProgress(95);


        this.log(`Successfully collected ${uniqUsers.length} groups from VK.`);

        const collection = await this.mongo.getCollection(
            this.params.mongo.db,
            this.params.mongo.membersCollection,
        );

        this.log(`Writing groups members to database...`);
        try {
            await collection.insertMany(uniqUsers, { ordered: false });
            this.log(`Successfully wrote vk groups members to databse.`);
            await this.reportProgress(100);
        } catch (e) {
            const message = `An error occured while writing. It seems some data was already in the databse.`;
            this.log(message);
            throw new Error(message);
        }
    }

    async dispose() {
        this.vkApi.dispose();
    }
}