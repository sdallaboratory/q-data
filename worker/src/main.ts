import 'reflect-metadata';
import { Job, Worker } from 'bullmq';
import { environment } from '../../shared/environment';
import { log } from '../../shared/logger/log';
import { container } from 'tsyringe';
import { JobProcessor } from './processors/job-processor';
import { VkCollectFriends } from './processors/processors/vk-collect-friends.processor';
import { ProcessorsRegistry } from './processors/registry/processors-registry';
import { VkCollectGroups } from './processors/processors/vk-collect-groups.processor';
import { VkCollectGroupsMembers } from './processors/processors/vk-collect-groups-members.processor';
import { VkMergeGroupsMembers } from './processors/processors/vk-merge-groups-members.processor';
import { vkCollectGroupsDefaultParams } from '../../shared/models/tasks/params/vk-collect-groups-default-params';
import { vkCollectGroupsMembersDefaultParams } from '../../shared/models/tasks/params/vk-collect-groups-members-default-params';
import { vkMergeGroupsMembersDefaultParams } from '../../shared/models/tasks/params/vk-merge-groups-members-default-params';
import { vkCollectFriendsDefaultParams } from '../../shared/models/tasks/params/vk-collect-friends-default-params';
import { SystemGetJobsList } from './processors/processors/system-get-jobs-list.processor';
import { BuildGraph } from './processors/processors/build-graph';
import { BuildGraphDefaultParams } from '../../shared/models/tasks/params/build-graph-default-params';

const registry = container.resolve(ProcessorsRegistry);

registry.registerAll(
    { processor: VkCollectGroups, defaultParams: vkCollectGroupsDefaultParams },
    { processor: VkCollectGroupsMembers, defaultParams: vkCollectGroupsMembersDefaultParams },
    { processor: VkMergeGroupsMembers, defaultParams: vkMergeGroupsMembersDefaultParams },
    { processor: VkCollectFriends, defaultParams: vkCollectFriendsDefaultParams },
    { processor: SystemGetJobsList },
    { processor: BuildGraph, defaultParams: BuildGraphDefaultParams },
);

async function runJob(job: Job) {
    const Processor = registry.get(job.name)?.processor;
    if (!Processor) {
        const message = `No appropriate processor found for task ${job.name}`;
        log('System', message);
        throw new Error(message);
    }
    const jobContainer = container.createChildContainer();
    jobContainer.register(Job, { useValue: job });
    const processor = jobContainer.resolve(Processor) as JobProcessor;
    log('System', `Successfully matched processor (${Processor.name}) for task ${job.name}. Starting processing...`);
    const result = await processor.process();
    processor.dispose?.();
    jobContainer.reset();
    return result;
}

const worker = new Worker(environment.QUEUE_NAME_TASKS, runJob, {
    connection: {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
    },
});

worker.waitUntilReady().then(
    () => log('System', `Worker is up and listening for jobs...`),
);
