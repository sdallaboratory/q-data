import { Job } from "bullmq";
import _ from "lodash";
import moment from "moment";
import { firstValueFrom, of, map } from "rxjs";
import { inject } from "tsyringe";
import { CachedMember, User } from "../../../../shared/models/entities/user";
import { isNotNill } from "../../../../shared/utils/is-not-nill";
import { mapArray } from "../../../../shared/utils/rxjs/operators/map-array";
import { MongoService } from "../../services/mongo.service";
import { VkApiService } from "../../services/vk-api.service";
import { JobDbProcessor } from "../job-db-processor";
import { VkMergeGroupsMembersParams } from "../../../../shared/models/tasks/params/vk-merge-groups-members-default-params";

type VkMergeGroupsMembersJob = Job<VkMergeGroupsMembersParams, void, 'vk-collect-groups-members'>;

export class VkMergeGroupsMembers extends JobDbProcessor<VkMergeGroupsMembersJob> {

    private readonly BMSTU_ID = 250;

    constructor(
        @inject(Job) protected readonly job: VkMergeGroupsMembersJob,
        protected readonly vkApi: VkApiService,
        protected readonly mongo: MongoService,
    ) {
        super(job, mongo);
    }

    stampAge<T extends { bdate?: string }>(user: T) {
        const bdate = user.bdate || '';
        const regex = /^(?<day>[0-3]?\d).(?<month>[01]?\d)(.(?<year>[12]\d\d\d))?$/;
        const groups = regex.exec(bdate)?.groups || {};
        const { year, month, day } = groups;
        if (!year || !month || !day) {
            return _.omit(user, 'bdate');
        }
        return {
            ...user,
            bdate: {
                year: Number(year),
                age: moment().diff(`${year}-${month}-${day}`, 'years'),
            }
        }
    };

    stampProblems(user: Partial<User>) {
        const problems = [] as string[];
        if (user.universities?.length && !user.universities?.some(({ id }) => id === this.BMSTU_ID)) {
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
        return problems.length ? { problems, ...user } : user;
    }

    async process() {
        this.log(`Merging groups members...`);

        const cacheCollection = await this.mongo.getCollection<Partial<CachedMember>>(this.params.mongo.db, this.params.mongo.membersCacheCollection);
        const membersCollection = await this.mongo.getCollection(this.params.mongo.db, this.params.mongo.membersCollection);

        const users = await cacheCollection.find().toArray();

        await this.reportProgress(10);
        this.log(`Totally collected ${users.length} users. Merging duplicated users...`);

        const uniqUsers = await firstValueFrom(
            of(
                await cacheCollection.find().toArray(),
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
                mapArray(user => this.stampId(user)),
                mapArray(user => this.stampMeta(user)),
                mapArray(user => this.stampProblems(user)),
                mapArray(user => this.stampAge(user)),
            ),
        );

        await this.reportProgress(95);

        this.log(`Successfully merged ${uniqUsers.length} users from VK.`);

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