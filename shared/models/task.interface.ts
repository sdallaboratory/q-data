
export interface Task<T = any> {
    type: string;
    params?: T;
    deps?: {
        mongo: string;
        // ... others
    };
}