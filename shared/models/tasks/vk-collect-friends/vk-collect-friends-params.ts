export interface VkCollectFriendsParams {
    mongo: {
        db: string;
        membersCollection: string;
        usersCollection: string;
        usersCacheCollection: string;
    };
    members: {
        bufferCount: number,
        skip: number,
        /**
         * If equals to 0, no limit is applied
         */
        limit: number,
    },

}