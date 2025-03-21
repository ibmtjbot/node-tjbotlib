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
 * TJBot capabilities
 * @readonly
 * @enum {string}
 */
export enum Capability {
    LISTEN = 'listen',
    LOOK = 'look',
    SHINE = 'shine',
    SPEAK = 'speak',
    WAVE = 'wave',
}

/**
 * TJBot hardware
 * @readonly
 * @enum {string}
 */
export enum Hardware {
    CAMERA = 'camera',
    LED_COMMON_ANODE = 'common_anode_led',
    LED_NEOPIXEL = 'neopixel_led',
    MICROPHONE = 'microphone',
    SERVO = 'servo',
    SPEAKER = 'speaker',
}

/**
 * IBM Watson AI services
 * @readonly
 * @enum {string}
 */
export enum WatsonService {
    SPEECH_TO_TEXT = 'speech_to_text',
    TEXT_TO_SPEECH = 'text_to_speech',
}

/**
 * TJBot servo motor stop positions
 * @readonly
 * @enum {int}
 */
export enum ServoPosition {
    ARM_BACK = 500,
    ARM_UP = 1400,
    ARM_DOWN = 2300,
}