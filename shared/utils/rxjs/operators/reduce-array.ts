import { reduce } from 'rxjs/operators';

export function reduceArray<T>() {
    return reduce((acc: T[], value: T[]) => [...acc, ...value]);
}
