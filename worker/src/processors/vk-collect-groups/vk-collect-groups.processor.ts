import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, of, mergeMap, map, reduce } from "rxjs";
import { inject } from "tsyringe";
import { GroupsGroup } from "vk-io/lib/api/schemas/objects";
import { log } from "../../../../shared/logger/log";
import { VkCollectGroupsParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-params";
// import { VkCollectGroupsJob } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job";
import { filterArray } from "../../../../shared/utils/rxjs/operators/filter-array";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobProcessorExecutor } from "../job-processor";
import { JobProcessor } from "../registry/job-processor.decorator";
import { vkCollectGroupsDefaultParams } from "./vk-collect-groups-default-params";

// TODO: Solve problem with this type at "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-job"
export type VkCollectGroupsJob = Job<VkCollectGroupsParams, void, 'default-collect-groups-from-vk'>;


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
        this.params
    }

    async process() {

        log('System', `Collectiong groups from vk with ${this.params.queries.length} queries...`);
        const groups = await firstValueFrom(
            of(...this.params.queries).pipe(
                mergeMap(query => this.vkApi.call('groups', 'search', { q: query, count: 1000 }), 10),
                map(response => response.items),
                reduce((acc, groups) => [...acc, ...groups], [] as GroupsGroup[]),
                filterArray(this.satisfies),
                map(groups => _.filter(groups, this.satisfies)),
                map(groups => _.uniqBy(groups, group => group.id)),
            ),
        );
        log('System', `Successfully collected groups from VK.`);

        const collection = await this.mongo.getCollection(
            this.params.mongo.db,
            this.params.mongo.collection
        );

        log('System', `Preparing writing vk groups for writeing to database...`);
        await collection.insertMany(groups);
        log('System', `Successfully wrote vk groups to databse.`);
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