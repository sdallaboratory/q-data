import { JobsOptions } from 'bullmq';
import { VkCollectFriendsParams } from './params/vk-collect-friends-default-params';
import { VkCollectGroupsParams } from './params/vk-collect-groups-default-params';
import { VkCollectGroupsMembersParams } from './params/vk-collect-groups-members-default-params';
import { VkMergeGroupsMembersParams } from './params/vk-merge-groups-members-default-params';

export type Task = {
    options?: JobsOptions;
    type: 'default';
} & BaseTask;

type BaseTask = {
    name: string;
    params: object;
}

// type BaseTask = {
//     name: 'VkCollectGroupsParams';
//     params: VkCollectGroupsParams;
// } | {
//     name: 'VkCollectGroupsMembersParams';
//     params: VkCollectGroupsMembersParams;
// } | {
//     name: 'VkCollectFriendsParams';
//     params: VkCollectFriendsParams;
// } | {
//     name: 'VkMergeGroupsMembersParams';
//     params: VkMergeGroupsMembersParams;
// }
