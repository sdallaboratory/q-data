import { OperatorFunction } from 'rxjs/internal/types';
export declare function filterArray<T, TResult extends T = T>(predicate: (value: T, index: number, arr: T[]) => value is TResult): OperatorFunction<T[], TResult[]>;
export declare function filterArray<T>(predicate: (value: T, index: number, arr: T[]) => boolean): OperatorFunction<T[], T[]>;
