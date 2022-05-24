import { Job } from "bullmq";
import _ from "lodash";
import { firstValueFrom, of, mergeMap, map, reduce, bufferCount, mergeAll } from "rxjs";
import { inject } from "tsyringe";
import { GroupsFields, GroupsGroup } from "vk-io/lib/api/schemas/objects";
import { log } from "../../../../shared/logger/log";
import { vkCollectGroupsDefaultParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params";
import { VkCollectGroupsParams } from "../../../../shared/models/tasks/vk-collect-groups/vk-collect-groups-params";
import { isNotNill } from "../../../../shared/utils/is-not-nill";
import { flatten } from "../../../../shared/utils/rxjs/operators/flatten";
import { mapArray } from "../../../../shared/utils/rxjs/operators/map-array";
import { zipShortest } from "../../../../shared/utils/zip-shortest";
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

    private readonly fields = [
        'description',
        'status',
        'site',
        'screen_name',
        'city',
        'counters',
        'members_count',
        'start_date',
    ] as GroupsFields[];

    async process() {
        log('System', `Collecting groups from vk with ${this.params.queries.length} queries...`, this.job.id);

        const groups = await firstValueFrom(
            of(...this.params.queries).pipe(
                bufferCount(25),
                mergeMap(async queries => zipShortest(
                    queries,
                    await this.vkApi.callButch('groups', 'search', queries.map(q => ({ q, count: 1000 })))
                ), 10),
                flatten(),
                map(([query, response]) => response.items.map(i => ({ ...i, query }))),
                map((v, i) => { this.reportProgress(i + 1, this.params.queries.length); return v }),
                reduce((acc, groups) => [...acc, ...groups]),
            ).pipe(
                map(groups => _(groups)
                    .groupBy(group => group.id)
                    .toPairs()
                    .map(([id, groupCopies]) => ({ ...groupCopies[0], query: groupCopies.map(({ query }) => query) }))
                    .value()
                ),
                flatten(),
                bufferCount(500),
                bufferCount(5),
                mergeMap(async chunk => zipShortest(
                    _.flattenDeep(chunk),
                    _.flattenDeep(await this.vkApi.callButch('groups', 'getById', chunk.map(groups => ({
                        group_ids: groups.map(g => g.id).filter(isNotNill),
                        fields: this.fields,
                    }))))
                )),
                mapArray(([partial, full]) => ({ ...partial, ...full })),
                flatten(),
            ).pipe(
                map(group => this.stampStopWords(group)),
                map(group => this.stampId(group)),
                map(group => this.stampMeta(group)),
                bufferCount(Infinity),
                map(groups => _.orderBy(groups, g => g.members_count, 'desc')),
            ),
        );

        log('System', `Successfully collected ${groups.length} groups from VK.`, this.job.id);

        const collection = await this.mongo.getCollection(
            this.params.mongo.db,
            this.params.mongo.collection
        );

        log('System', `Preparing writing vk groups for writeing to database...`, this.job.id);
        try {
            await collection.insertMany(groups, { ordered: false });
            log('System', `Successfully wrote vk groups to databse.`, this.job.id);
        } catch (e) {
            const message = `An error occured while writing.It seems some data was already in the databse.`;
            log('System', message, this.job.id);
            throw new Error(message);
        }
    }

    stampStopWords(group: GroupsGroup) {
        const { caseSensitive, caseInsensitive } = this.job.data.stopWords;

        const groupString = [
            group.city?.title,
            group.name,
            group.description,
            group.status,
            group.site,
            group.screen_name,
        ].join();

        const stopWords = [
            ...caseSensitive.filter(w => groupString.includes(w)),
            ...caseInsensitive.filter(w => new RegExp(w, 'i').test(groupString)),
        ];

        return stopWords.length ? { ...group, stopWords } : group;
    }

    async dispose() {
        await Promise.all([
            this.vkApi.dispose(),
            this.mongo.dispose(),
        ]);
    }
}
