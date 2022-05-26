import { UsersUserFull1 } from 'vk-io/lib/api/schemas/objects';

type Group = {
    id: number;
    name?: string;
    members_count?: number;
};

export type UserBase = Partial<UsersUserFull1> & {
    id: number;
    bdate?: {
        year: number;
        age: number;
    },
    friends: {
        count: number;
        ids: number[];
    }
};

export interface CachedMember extends UserBase {
    group: Group;
}

export interface User extends UserBase {
    group: Group[];
}
