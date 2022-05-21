import _ from 'lodash';
import { environment } from '../../../environment'
import { VkCollectGroupsMembersParams } from './vk-collect-groups-members-params'

export const vkCollectGroupsMembersDefaultParams: VkCollectGroupsMembersParams = {
    mongo: {
        groupsCollection: 'groups',
        membersCollection: 'groups_members',
        membersCacheCollection: 'groups_members_cache',
        db: environment.MONGO_DB,
    },
};