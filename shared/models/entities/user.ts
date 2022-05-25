import { UsersUserFull1 } from 'vk-io/lib/api/schemas/objects';

type Group = {
    id: number,
    name?: string
};

export type User = Partial<UsersUserFull1> & {
    id: number,
    bdate?: {
        year: number,
        age: number
    },
    group: Group | Group[],
    friends: {
        count: number,
        ids: number[]
    }
};
