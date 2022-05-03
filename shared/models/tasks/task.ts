import { VkCollectGroupsParams } from './vk-collect-groups/vk-collect-groups-params';

export type Task = {
    name: 'vk-collect-groups';
    type: 'default';
    params: VkCollectGroupsParams;
} // | { ... } TODO: Add all implemented tasks here
