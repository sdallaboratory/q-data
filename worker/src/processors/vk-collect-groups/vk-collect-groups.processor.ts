import { Job } from "bullmq";
import _ from "lodash";
import { ObjectId } from "mongodb";
import { firstValueFrom, of, mergeMap, map, reduce, tap, bufferCount } from "rxjs";
import { inject } from "tsyringe";
import { GroupsGroup } from "vk-io/lib/api/schemas/objects";
import { log } from "../../../../shared/logger/log";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { VkCollectGroupsParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-params";
// import { VkCollectGroupsJob } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job";
import { filterArray } from "../../../../shared/utils/rxjs/operators/filter-array";
import { mapArray } from "../../../../shared/utils/rxjs/operators/map-array";
import { zipShortest } from "../../../../shared/utils/zip";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobProcessorExecutor } from "../job-processor";
import { JobProcessor } from "../registry/job-processor.decorator";

// TODO: Solve problem with this type at "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job"
export type VkCollectGroupsJob = Job<VkCollectGroupsParams, void, 'vk-collect-groups'>;


@JobProcessor({
    taskName: 'vk-collect-groups',
    defaultParams: vkCollectGroupsDefaultParams,
})
export class VkCollectGroups extends JobProcessorExecutor<VkCollectGroupsJob> {

    constructor(
        @inject(Job) protected readonly job: VkCollectGroupsJob,
        protected readonly vkApi: VkApiService,
        protected readonly mongo: MongoService,
    ) {
        super();
    }

    async process() {
        log('System', `Collecting groups from vk with ${this.params.queries.length} queries...`);
        const groups = await firstValueFrom(
            of(...this.params.queries).pipe(
                bufferCount(25),
                mergeMap(async queries => zipShortest(
                    queries,
                    await this.vkApi.callButch('groups', 'search', queries.map(q => ({ q, count: 1000 })))
                ), 10),
                mergeMap(pairs => of(...pairs)),
                map(([query, response]) => response.items.map(i => ({ ...i, query })))
            ).pipe(
                map((v, i) => { this.reportProgress(i + 1, this.params.queries.length); return v }),
            ).pipe(
                reduce((acc, groups) => [...acc, ...groups]),
                map(groups => _(groups)
                    .groupBy(group => group.id)
                    .toPairs()
                    .map(([id, groups]) => ({ ...groups[0], query: groups.map(({ query }) => query) }))
                    .value()
                ),
                mapArray(group => ({ ...group, valid: this.satisfies(group) })),
                mapArray(group => ({ ...group, _id: new ObjectId(group.id) })),
                mapArray(group => this.stampMeta(group)),
            ),
        );

        log('System', `Successfully collected ${groups.length} groups from VK.`);

        const collection = await this.mongo.getCollection(
            this.params.mongo.db,
            this.params.mongo.collection
        );

        log('System', `Preparing writing vk groups for writeing to database...`);
        try {
            await collection.insertMany(groups, { ordered: false });
            log('System', `Successfully wrote vk groups to databse.`);
        } catch (e) {
            log('System', `En error occured while writing. It seems some data was already in the databse.`);
        }
    }

    satisfies(group: GroupsGroup) {
        const { caseSensitive, caseInsensitive } = this.job.data.stopWords;
        const groupString = [
            group.city && group.city.title,
            group.name,
            group.description,
            group.status,
            group.site,
            group.screen_name,
        ].join(' ');
        let hasStopWords = caseSensitive.some(w => groupString.includes(w));
        if (!hasStopWords) {
            const lower = groupString.toLowerCase();
            hasStopWords = caseInsensitive.map(_.toLower).some(s => lower.includes(s));
        }
        return !hasStopWords;
    }

    async dispose() {
        this.vkApi.dispose();
    }
}