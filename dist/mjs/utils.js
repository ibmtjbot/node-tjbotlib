"use strict";
/**
 * Copyright 2025 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.convertHexToRgbColor = convertHexToRgbColor;
exports.normalizeColor = normalizeColor;
const colornames_1 = __importDefault(require("colornames"));
const winston_1 = __importDefault(require("winston"));
/**
 * Put TJBot to sleep.
 * @param {number} sec Number of seconds to sleep for.
 */
function sleep(sec) {
    const msec = sec * 1000;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, msec);
}
/**
* Convert hex color to RGB value.
* @param {string} hexColor Hex color (e.g. FF8888)
* @return {array} RGB color (e.g. (255, 128, 128))
* @private
*/
function convertHexToRgbColor(hexColor) {
    const rgbHex = hexColor
        .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (_m, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
        .substring(1)
        .match(/.{2}/g);
    if (rgbHex !== null) {
        const rgb = rgbHex.map((x) => parseInt(x, 16));
        return [rgb[0], rgb[1], rgb[2]];
    }
    else {
        winston_1.default.warn(`an error occurred converting hex color ${hexColor} to RGB, returning [0, 0, 0]`);
        return [0, 0, 0];
    }
}
/**
 * Normalize the given color to #RRGGBB.
 * @param {string} color The color to shine the LED. May be specified in a number of
 * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
 * or may be a named color in the `colornames` package. Hexadecimal colors
 * follow an #RRGGBB format.
 * @return {string} Hex string corresponding to the given color (e.g. "#RRGGBB")
 * @private
 */
function normalizeColor(color) {
    let normColor = color;
    // assume undefined == "off"
    if (normColor === undefined) {
        normColor = 'off';
    }
    // is this "on" or "off"?
    if (normColor === 'on') {
        normColor = 'FFFFFF';
    }
    else if (normColor === 'off') {
        normColor = '000000';
    }
    // strip prefixes if they are present
    if (normColor.startsWith('0x')) {
        normColor = normColor.slice(2);
    }
    if (normColor.startsWith('#')) {
        normColor = normColor.slice(1);
    }
    // is this a hex number or a named color?
    const isHex = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i;
    let rgb;
    if (!isHex.test(normColor)) {
        rgb = (0, colornames_1.default)(normColor);
    }
    else {
        rgb = normColor;
    }
    // did we get something back?
    if (rgb === undefined) {
        throw new Error(`TJBot did not understand the specified color "${color}"`);
    }
    // prefix rgb with # in case it's not
    if (!rgb.startsWith('#')) {
        rgb = `#${rgb}`;
    }
    // throw an error if we didn't understand this color
    if (rgb.length !== 7) {
        throw new Error(`TJBot did not understand the specified color "${color}"`);
    }
    return rgb;
}
