import { OperatorFunction } from 'rxjs/internal/types';
import { map } from 'rxjs/operators';

export function filterArray<T, TResult extends T = T>(
    predicate: (value: T, index: number, arr: T[]) => value is TResult
): OperatorFunction<T[], TResult[]>;

export function filterArray<T>(
    predicate: (value: T, index: number, arr: T[]) => boolean
): OperatorFunction<T[], T[]>;

export function filterArray<T>(
    predicate: (value: T, index: number, arr: T[]) => boolean
): OperatorFunction<T[], T[]> {
    return map((array: T[]) => array.filter(predicate));
}