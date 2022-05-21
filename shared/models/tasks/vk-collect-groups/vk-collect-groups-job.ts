
import { VkCollectGroupsParams } from "./vk-collect-groups-params";
import { Job } from 'bullmq';

export type VkCollectGroupsJob = Job<VkCollectGroupsParams, void, 'vk-collect-groups'> & {queue: any};
