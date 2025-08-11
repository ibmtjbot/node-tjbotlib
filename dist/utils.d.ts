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
/**
 * Put TJBot to sleep.
 * @param {number} sec Number of seconds to sleep for.
 */
export declare function sleep(sec: number): void;
/**
* Convert hex color to RGB value.
* @param {string} hexColor Hex color (e.g. FF8888)
* @return {array} RGB color (e.g. (255, 128, 128))
* @private
*/
export declare function convertHexToRgbColor(hexColor: string): [number, number, number];
/**
 * Normalize the given color to #RRGGBB.
 * @param {string} color The color to shine the LED. May be specified in a number of
 * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
 * or may be a named color in the `colornames` package. Hexadecimal colors
 * follow an #RRGGBB format.
 * @return {string} Hex string corresponding to the given color (e.g. "#RRGGBB")
 * @private
 */
export declare function normalizeColor(color: string): string;
