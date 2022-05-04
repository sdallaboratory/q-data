import { JobsOptions } from 'bullmq';
import { VkCollectGroupsParams } from './vk-collect-groups/vk-collect-groups-params';

export type Task = {
    name: 'vk-collect-groups';
    type: 'default';
    params: VkCollectGroupsParams;
    /**
     * Currently unsupported. Allows specify native BullMQ job options.
     */
    options?: JobsOptions;
} // | { ... } TODO: Add all implemented tasks here
