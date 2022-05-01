
export interface Task<T = any> {
    name: string;
    params?: T;
    deps?: {
        mongo: string;
        // ... others
    };
}