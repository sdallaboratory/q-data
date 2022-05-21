import _ from "lodash";

export function isNotNill<T>(arg: T): arg is Exclude<T, null | undefined> {
    return !_.isNil(arg);
}
