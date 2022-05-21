import { JobsOptions } from 'bullmq';
import { VkCollectGroupsMembersParams } from './vk-collect-groups-members/vk-collect-groups-members-params';
import { VkCollectGroupsParams } from './vk-collect-groups/vk-collect-groups-params';

export type Task = {
    name: 'vk-collect-groups';
    type: 'default';
    params: VkCollectGroupsParams;
    /**
     * Currently unsupported. Allows specify native BullMQ job options.
     */
    options?: JobsOptions;
} | {
    name: 'vk-collect-groups-members';
    type: 'default';
    params: VkCollectGroupsMembersParams;
    /**
     * Currently unsupported. Allows specify native BullMQ job options.
     */
    options?: JobsOptions;
} // | { ... } TODO: Add all implemented tasks here
