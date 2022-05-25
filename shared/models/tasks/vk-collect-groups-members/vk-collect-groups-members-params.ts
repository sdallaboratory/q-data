export interface VkCollectGroupsMembersParams {
    mongo: {
        db: string;
        groupsCollection: string;
        membersCollection: string;
        membersCacheCollection: string;
    };
    groups: {
        bufferCount: number,
        skip: number,
        /**
         * If equals to 0, no limit is applied
         */
        limit: number,
    },

}