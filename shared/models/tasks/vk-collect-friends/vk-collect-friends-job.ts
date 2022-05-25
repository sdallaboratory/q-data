import { VkCollectFriendsParams } from './vk-collect-friends-params'
import { Job } from 'bullmq';

export type VkCollectFriendsJob = Job<VkCollectFriendsParams, void, 'vk-collect-groups-members'>;
