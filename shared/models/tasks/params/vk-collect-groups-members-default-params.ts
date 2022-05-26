import { environment } from '../../../environment';

export const vkCollectGroupsMembersDefaultParams = {
    mongo: {
        groupsCollection: 'groups',
        membersCollection: 'groups_members',
        membersCacheCollection: 'groups_members_cache',
        db: environment.MONGO_DB,
    },
    groups: {
        bufferCount: 10,
        skip: 0,
        limit: 10,
    }
};

export type VkCollectGroupsMembersParams = typeof vkCollectGroupsMembersDefaultParams;