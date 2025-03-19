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
import ws281x from 'rpi-ws281x-native';

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

class ws281xLED {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _neopixel: any;

    constructor(pin: number) {
        this._neopixel = ws281x;
        this._neopixel.init(1, {
            pin,
        });

        // capture 'this' context so we can reference it in the callback
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        // reset the LED before the program exits
        process.on('SIGINT', () => {
            self._neopixel.reset();
            process.nextTick(() => {
                process.exit(0);
            });
        });
    }

    render(color: number) {
        const colors = new Uint32Array(1);
        colors[0] = color;
        this._neopixel.render(colors);
    }
}

class RPi4Driver extends RPiHardwareDriver {
    _commonAnodeLed: GPIOLED;
    _neopixelLed: ws281xLED;
    _useGRBFormat: boolean;
    _servo: Gpio;

    constructor() {
        super();
    }

    _setupLEDCommonAnode(redPin: number, greenPin: number, bluePin: number) {
        winston.verbose(`💡 initializing ${TJBot.Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this._commonAnodeLed = new GPIOLED(redPin, greenPin, bluePin);
    }

    _setupLEDNeopixel(config: { [key: string]: string } ) {
        const pinStr: string = config['pin'] ?? '12';
        const pin: number = parseInt(pinStr);
        winston.verbose(`💡 initializing ${TJBot.Hardware.LED_NEOPIXEL} on pin ${pin}`);
        this._neopixelLed = new ws281xLED(pin);
        this._useGRBFormat = (config['useGRB'] ?? "false") == "true";
    }

    _setupServo(pin: number) {
        winston.verbose(`🦾 initializing ${TJBot.Hardware.SERVO} on PIN ${pin}`);
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
            const c: string = hexColor;

            if (this._useGRBFormat) {
                const grbStr: string = `0x${c[3]}${c[4]}${c[1]}${c[2]}${c[5]}${c[6]}`;
                const grb: number = parseInt(grbStr, 16);
                this._neopixelLed.render(grb);
            } else {
                const rgbStr: string = `0x${c[1]}${c[2]}${c[3]}${c[4]}${c[5]}${c[6]}`;
                const rgb: number = parseInt(rgbStr, 16);
                this._neopixelLed.render(rgb);
            }
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

export default RPi4Driver;
