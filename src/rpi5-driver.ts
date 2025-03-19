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

import winston from 'winston';
import { Gpio } from 'pigpio';
import SPI from 'pi-spi';

import { ServoPosition } from './constants.ts';
import RPiHardwareDriver from './rpi-driver.ts';

class GPIOLED {
    redPin: Gpio;
    greenPin: Gpio;
    bluePin: Gpio;

    constructor(red: number, green: number, blue: number) {
        this.redPin = new Gpio(red, { mode: Gpio.OUTPUT });
        this.greenPin = new Gpio(green, { mode: Gpio.OUTPUT });
        this.bluePin = new Gpio(blue, { mode: Gpio.OUTPUT });
    }
}

class SPILED {
    // this class is based on pi5neo.py
    // https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
    
    _spi: SPI.SPI;

    constructor(spiInterface: string) {
        const i = spiInterface || "/dev/spidev0.0";
        this._spi = SPI.initialize(i);
    }

    static bitMask(byte: number, index: number): boolean {
        return (byte & (1 << index)) != 0;
    }

    static byteToBitstream(byte): number[] {
        // Initialize with low bits
        const bitstream: number[] = [0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0];
        
        for (let i = 0; i < 8; i++) {
            if (SPILED.bitMask(byte, i)) {
                // Set high bits for '1'
                bitstream[i] = 0xF8;
            }
        }
        
        return bitstream;
    }
    
    static rgbToSpiBitstream(red: number, green: number, blue: number): Buffer {
        const red_bits = SPILED.byteToBitstream(red);
        const green_bits = SPILED.byteToBitstream(green);
        const blue_bits = SPILED.byteToBitstream(blue);
        const bitstream = Buffer.from(red_bits.concat(green_bits).concat(blue_bits));
        return bitstream;
    }
    
    /**
     * Render the LED a specified color.
     * @param {string} color The color to shine the LED, specified as a string of hexadecimal digits with no
     * leading '0x' or '#' in RRGGBB format.
     */
    render(color: string): void {
        const c = parseInt(color, 16);
        const r = (c & 0xFF0000) >> 16;
        const g = (c & 0x00FF00) >> 8;
        const b = (c & 0x0000FF) >> 0;
        winston.verbose(`rendering LED color ${color} (RGB: ${r} ${g} ${b})`);

        const bitstream = SPILED.rgbToSpiBitstream(r, g, b);
        this._spi.transfer(bitstream, bitstream.length, function (e, d) {
            if (e) {
                throw e;
            }
        });
    }
}

class RPi5Driver extends RPiHardwareDriver {
    _commonAnodeLed: GPIOLED;
    _neopixelLed: SPILED;
    _servo: Gpio;

    constructor() {
        super();
    }

    _setupLEDCommonAnode(redPin: number, greenPin: number, bluePin: number) {
        winston.verbose(`💡 initializing common anode LED on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this._commonAnodeLed = new GPIOLED(redPin, greenPin, bluePin);
    }

    _setupLEDNeopixel(config: { [key: string]: string }) {
        const spiInterface = config['spiInterface'] ?? '/dev/spidev0.0';
        winston.verbose(`💡 initializing NeoPixel on SPI ${spiInterface}`);
        this._neopixelLed = new SPILED(spiInterface);
    }

    _setupServo(pin: number) {
        winston.verbose(`🦾 initializing servo on PIN ${pin}`);
        this._servo = new Gpio(pin, { mode: Gpio.OUTPUT });
    }

    _renderCommonAnodeLED(rgbColor: [number, number, number]): void {
        if (this._commonAnodeLed) {
            this._commonAnodeLed.redPin.pwmWrite(rgbColor[0] == null ? 255 : 255 - rgbColor[0]);
            this._commonAnodeLed.greenPin.pwmWrite(rgbColor[1] == null ? 255 : 255 - rgbColor[1]);
            this._commonAnodeLed.bluePin.pwmWrite(rgbColor[2] == null ? 255 : 255 - rgbColor[2]);
        } else {
            winston.warn('attempted to render on an uninitialized Common Anode LED');
        }
    }

    _renderNeopixelLed(hexColor: string): void {
        if (this._neopixelLed) {
            this._neopixelLed.render(hexColor);
        } else {
            winston.warn('attempted to render on an uninitialized Neopixel LED');
        }
    }

    _renderServoPosition(position: ServoPosition): void {
        if (this._servo) {
            this._servo.servoWrite(position);
        } else {
            winston.warn('attempted to render on an uninitialized servo');
        }
    }
}

export default RPi5Driver;
