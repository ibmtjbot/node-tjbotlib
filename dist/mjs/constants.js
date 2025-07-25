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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServoPosition = exports.WatsonService = exports.Hardware = exports.Capability = void 0;
/**
 * TJBot capabilities
 * @readonly
 * @enum {string}
 */
var Capability;
(function (Capability) {
    Capability["LISTEN"] = "listen";
    Capability["LOOK"] = "look";
    Capability["SHINE"] = "shine";
    Capability["SPEAK"] = "speak";
    Capability["WAVE"] = "wave";
})(Capability || (exports.Capability = Capability = {}));
/**
 * TJBot hardware
 * @readonly
 * @enum {string}
 */
var Hardware;
(function (Hardware) {
    Hardware["CAMERA"] = "camera";
    Hardware["LED_COMMON_ANODE"] = "common_anode_led";
    Hardware["LED_NEOPIXEL"] = "neopixel_led";
    Hardware["MICROPHONE"] = "microphone";
    Hardware["SERVO"] = "servo";
    Hardware["SPEAKER"] = "speaker";
})(Hardware || (exports.Hardware = Hardware = {}));
/**
 * IBM Watson AI services
 * @readonly
 * @enum {string}
 */
var WatsonService;
(function (WatsonService) {
    WatsonService["SPEECH_TO_TEXT"] = "speech_to_text";
    WatsonService["TEXT_TO_SPEECH"] = "text_to_speech";
})(WatsonService || (exports.WatsonService = WatsonService = {}));
/**
 * TJBot servo motor stop positions
 * @readonly
 * @enum {int}
 */
var ServoPosition;
(function (ServoPosition) {
    ServoPosition[ServoPosition["ARM_BACK"] = 500] = "ARM_BACK";
    ServoPosition[ServoPosition["ARM_UP"] = 1400] = "ARM_UP";
    ServoPosition[ServoPosition["ARM_DOWN"] = 2300] = "ARM_DOWN";
})(ServoPosition || (exports.ServoPosition = ServoPosition = {}));
