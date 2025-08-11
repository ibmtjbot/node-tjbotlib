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
import { JsonMap } from '@iarna/toml';
import { Gpio } from 'pigpio';
import SPI from 'pi-spi';
import { ServoPosition } from './constants.js';
import { RPiBaseHardwareDriver } from './rpi-driver.js';
declare class GPIOLED {
    redPin: Gpio;
    greenPin: Gpio;
    bluePin: Gpio;
    constructor(red: number, green: number, blue: number);
}
declare class SPILED {
    spi: SPI.SPI;
    static readonly HIGH: number;
    static readonly LOW: number;
    static readonly FREQ: number;
    constructor(spiInterface: string);
    static bitMask(byte: number, index: number): boolean;
    static byteToBitstream(byte: number): number[];
    static rgbToSpiBitstream(red: number, green: number, blue: number): Buffer;
    /**
     * Render the LED a specified color.
     * @param {string} color The color to shine the LED, specified as a string of hexadecimal digits with no
     * leading '0x' or '#' in RRGGBB format.
     */
    render(color: string): void;
}
declare class RPi5Driver extends RPiBaseHardwareDriver {
    commonAnodeLed: GPIOLED | undefined;
    neopixelLed: SPILED | undefined;
    servo: Gpio | undefined;
    constructor();
    setupLEDCommonAnode(config: JsonMap): void;
    setupLEDNeopixel(config: JsonMap): void;
    setupServo(config: JsonMap): void;
    renderLEDCommonAnode(rgbColor: [number, number, number]): void;
    renderLEDNeopixel(hexColor: string): void;
    renderServoPosition(position: ServoPosition): void;
}
export default RPi5Driver;
