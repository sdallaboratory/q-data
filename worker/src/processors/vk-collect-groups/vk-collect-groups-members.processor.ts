import { Job } from "bullmq";
import _ from "lodash";
import { ObjectId } from "mongodb";
import { firstValueFrom, of, mergeMap, map, reduce, tap, bufferCount, mergeWith } from "rxjs";
import { inject } from "tsyringe";
import { GroupsGroup } from "vk-io/lib/api/schemas/objects";
import { log } from "../../../../shared/logger/log";
import { VkCollectGroupsMembersParams } from "../../../../shared/models/tasks/vk-collect-groups-members/vk-collect-groups-members-params";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { VkCollectGroupsParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-params";
// import { VkCollectGroupsJob } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job";
import { filterArray } from "../../../../shared/utils/rxjs/operators/filter-array";
import { mapArray } from "../../../../shared/utils/rxjs/operators/map-array";
import { reduceArray } from "../../../../shared/utils/rxjs/operators/reduce-array";
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

    constructor(
        @inject(Job) protected readonly job: VkCollectGroupsMembersJob,
        protected readonly vkApi: VkApiService,
        protected readonly mongo: MongoService,
    ) {
        super();
    }

    async process() {
        log('System', `Collecting groups members from vk...`);
        type Document = GroupsGroup & { id: number }; // TODO: Move it to separate files
        const groupsCollection = await this.mongo.getCollection<Document>(this.params.mongo.db, this.params.mongo.groupsCollection);
        const groupsIds = await groupsCollection.find().map(doc => doc.id).toArray();

        log('System', `There is ${groupsIds.length} groups in database vk...`);
        await this.reportProgress(10);


        const groupsCounts = await firstValueFrom(
            of(...groupsIds).pipe(
                bufferCount(25),
                mergeMap(async ids => zipShortest(
                    ids,
                    await this.vkApi.callButch('groups', 'getMembers', ids.map(id => ({ group_id: String(id), count: 1000 }))),
                ), 10),
                mergeMap(pairs => of(...pairs)),
                map(([id, response]) => ({ ...response, id })),
                bufferCount(Infinity),
            ),
        );

        await this.reportProgress(20);

        const params = _(groupsCounts)
            .flatMap((group) => ({ ...group, count: 1000, offest: _.range(1, Math.ceil(group.count / 1000)).map(o => o * 1000) }))
            .value();

        log('System', `${params.length} requests to vk API are left to collect all members...`);
        await this.reportProgress(25);

        const users = of(...params).pipe(
            bufferCount(25),
            mergeMap(async params => zipShortest(
                params,
                await this.vkApi.callButch('groups', 'getMembers', params)
            ), 10),
            mergeMap(pairs => of(...pairs.map(([{ id }, s]) => ({ ...s, id })))),
            mergeWith(of(...groupsCounts)),
            mergeMap(response => response.items.map(id => ({ id, group: response.id }))),
            bufferCount(Infinity)
        );
        
        await this.reportProgress(90);
        log('System', `Preparing collected result to write into database...`);

        const uniqUsers = await firstValueFrom(users.pipe(
            map(users => _(users)
                .groupBy(users => users.id)
                .toPairs()
                .map(([id, users]) => ({ id: users[0].id, groups: users.map(({ group }) => group) }))
                .value()
            ),
            mapArray(group => this.stampId(group)),
            mapArray(group => this.stampMeta(group)),
        ));

        await this.reportProgress(95);


        log('System', `Successfully collected ${uniqUsers.length} groups from VK.`);

        const collection = await this.mongo.getCollection(
            this.params.mongo.db,
            this.params.mongo.membersCollection,
        );

        log('System', `Writing groups members to database...`);
        try {
            await collection.insertMany(groupsIds, { ordered: false });
            log('System', `Successfully wrote vk groups members to databse.`);
            await this.reportProgress(100);
        } catch (e) {
            log('System', `En error occured while writing. It seems some data was already in the databse.`);
        }
    }

    async dispose() {
        this.vkApi.dispose();
    }
}