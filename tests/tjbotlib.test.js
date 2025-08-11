/* eslint-disable no-undef */
/**
 * Copyright 2016-2023 IBM Corp. All Rights Reserved.
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

import { expect, test } from 'vitest';
import TJBot from '../src/tjbot';
import { Hardware } from '../src/constants';

test('instantiate TJBot', () => {
    const tjbot = new TJBot();
    expect(tjbot).toBeDefined();
});

test('initialize TJBot with no hardware', () => {
    const tjbot = new TJBot();
    tjbot.initialize([]);
    expect(tjbot).toBeDefined();
});

test('initialize TJBot with all hardware', () => {
    const tjbot = new TJBot();
    tjbot.initialize(Object.keys(Hardware));
    expect(tjbot).toBeDefined();
});

test('make sure TJBot class exports the Hardware list correctly', () => {
    const hardware = TJBot.Hardware;
    expect(hardware.length > 0);
    expect(hardware.indexOf(Hardware.CAMERA) > -1);
    expect(hardware.indexOf(Hardware.LED_COMMON_ANODE) > -1);
    expect(hardware.indexOf(Hardware.LED_NEOPIXEL) > -1);
    expect(hardware.indexOf(Hardware.MICROPHONE) > -1);
    expect(hardware.indexOf(Hardware.SERVO) > -1);
    expect(hardware.indexOf(Hardware.SPEAKER) > -1);
});
