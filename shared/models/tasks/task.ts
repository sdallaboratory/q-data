import { JobsOptions } from 'bullmq';
import { VkCollectFriendsParams } from './vk-collect-friends/vk-collect-friends-params';
import { VkCollectGroupsMembersParams } from './vk-collect-groups-members/vk-collect-groups-members-params';
import { VkCollectGroupsParams } from './vk-collect-groups/vk-collect-groups-params';

export type Task = {
    options?: JobsOptions;
} & BaseTask;

type BaseTask = {
    name: 'vk-collect-groups';
    type: 'default';
    params: VkCollectGroupsParams;
    /**
     * Currently unsupported. Allows specify native BullMQ job options.
     */
} | {
    name: 'vk-collect-groups-members';
    type: 'default';
    params: VkCollectGroupsMembersParams;
    /**
     * Currently unsupported. Allows specify native BullMQ job options.
     */
} | {
    name: 'vk-collect-friends';
    type: 'default';
    params: VkCollectFriendsParams;
    /**
     * Currently unsupported. Allows specify native BullMQ job options.
     */
}// | { ... } TODO: Add all implemented tasks here
