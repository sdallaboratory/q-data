import { map } from 'rxjs/operators';

export function mapArray<T, TResult>(
    projection: (elem: T) => TResult,
) {
    return map((array: T[]) => array.map(projection));
}
