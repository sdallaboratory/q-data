import { environment } from '../../../environment'

export const BuildGraphDefaultParams = {
    mongo: {
        db: environment.MONGO_DB,
        membersCollection: 'groups_members',
        usersCollection: 'users_friends',
        usersCacheCollection: 'users_friends_cache',
    },
    members: {
        bufferCount: 25,
        skip: 0,
        limit: 0,
    },
};

export type BuildGraphParams = typeof BuildGraphDefaultParams;