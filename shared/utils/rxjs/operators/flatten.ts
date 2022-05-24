import { of } from "rxjs";
import { mergeMap } from "rxjs/operators";

export function flatten<T extends unknown[]>() {
    return mergeMap((items: T) => of(...items));
}