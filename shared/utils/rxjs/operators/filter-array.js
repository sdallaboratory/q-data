"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterArray = void 0;
const operators_1 = require("rxjs/operators");
function filterArray(predicate) {
    return (0, operators_1.map)((array) => array.filter(predicate));
}
exports.filterArray = filterArray;
