// Add support for multiple arrays
export function zipShortest<T1, T2>(array1: T1[], array2: T2[]) {
    const res = [];
    for (let i = 0; i < Math.min(array1.length, array2.length); i++) {
        res.push([array1[i], array2[i]] as [T1, T2]);
    }
    return res;
}