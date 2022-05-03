export interface VkCollectGroupsParams {
    mongo: {
        db: string;
        collection: string;
    };
    queries: string[];
    stopWords: {
        caseSensitive: string[];
        caseInsensitive: string[];
    };
}