import { GroupsGroup } from 'vk-io/lib/api/schemas/objects';

export type Group = Partial<GroupsGroup> & { id: number; stopWords?: string[], query: string[] };
