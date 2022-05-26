import _ from 'lodash';
import { environment } from '../../../environment'

export const vkMergeGroupsMembersDefaultParams = {
    mongo: {
        membersCollection: 'groups_members',
        membersCacheCollection: 'groups_members_cache',
        db: environment.MONGO_DB,
    },
};

export type VkMergeGroupsMembersParams = typeof vkMergeGroupsMembersDefaultParams;