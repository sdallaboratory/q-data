"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
function log(type, text, id = 'unknown') {
    const typeConstWidth = type + ' '.repeat(9).slice(type.length);
    console.log(new Date().toLocaleString(), '|', typeConstWidth, `(${id})`, ':', text);
}
exports.log = log;
