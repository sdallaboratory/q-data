export interface VkCollectGroupsMembersParams {
    mongo: {
        db: string;
        groupsCollection: string;
        membersCollection: string;
        membersCacheCollection: string;
    };
}