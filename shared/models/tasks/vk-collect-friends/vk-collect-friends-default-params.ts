import _ from 'lodash';
import { environment } from '../../../environment'
import { VkCollectFriendsParams } from './vk-collect-friends-params'

export const vkCollectFriendsDefaultParams: VkCollectFriendsParams = {
    mongo: {
        db: environment.MONGO_DB,
        membersCollection: 'groups_members',
        usersCollection: 'users_friends',
        usersCacheCollection: 'users_friends_cache',
    },
    members: {
        bufferCount: 10,
        skip: 0,
        limit: 15,
    },
};