
import { VkCollectGroupsMembersParams } from "./vk-collect-groups-members-params";
import { Job } from 'bullmq';

export type VkCollectGroupsMembersJob = Job<VkCollectGroupsMembersParams, void, 'vk-collect-groups-members'>;
