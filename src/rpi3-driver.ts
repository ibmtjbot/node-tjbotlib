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
import TOML from '@iarna/toml';
import { Gpio } from 'pigpio';
import ws281x from 'rpi-ws281x-native';

import { Hardware, ServoPosition } from './constants';
import { RPiBaseHardwareDriver } from './rpi-driver';

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
    neopixel: any;

    constructor(pin: number) {
        this.neopixel = ws281x;
        this.neopixel.init(1, {
            pin,
        });

        // capture 'this' context so we can reference it in the callback
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        // reset the LED before the program exits
        process.on('SIGINT', () => {
            self.neopixel.reset();
            process.nextTick(() => {
                process.exit(0);
            });
        });
    }

    render(color: number) {
        const colors = new Uint32Array(1);
        colors[0] = color;
        this.neopixel.render(colors);
    }
}

class RPi3Driver extends RPiBaseHardwareDriver {
    commonAnodeLed: GPIOLED;
    neopixelLed: ws281xLED;
    useGRBFormat: boolean;
    servo: Gpio;

    constructor() {
        super();
    }

    setupLEDCommonAnode(config: TOML.AnyJson): void {
        const redPin: number = config['redPin'] ?? 19;
        const greenPin: number = config['greenPin'] ?? 13;
        const bluePin: number = config['bluePin'] ?? 12;
        winston.verbose(`💡 initializing ${Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this.commonAnodeLed = new GPIOLED(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED_COMMON_ANODE);
    }

    setupLEDNeopixel(config: TOML.AnyJson): void {
        const pin: number = config['gpioPin'] ?? 12;
        winston.verbose(`💡 initializing ${Hardware.LED_NEOPIXEL} on pin ${pin}`);
        this.neopixelLed = new ws281xLED(pin);
        this.useGRBFormat = (config['useGRB'] ?? "false") == "true";
        this.initializedHardware.add(Hardware.LED_NEOPIXEL);
    }

    setupServo(config: TOML.AnyJson): void {
        const pin: number = config['servoPin'] ?? 7;
        winston.verbose(`🦾 initializing ${Hardware.SERVO} on PIN ${pin}`);
        this.servo = new Gpio(pin, { mode: Gpio.OUTPUT });
        this.initializedHardware.add(Hardware.SERVO);
    }

    renderLEDCommonAnode(rgbColor: [number, number, number]): void {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.redPin.pwmWrite(rgbColor[0] == null ? 255 : 255 - rgbColor[0]);
            this.commonAnodeLed.greenPin.pwmWrite(rgbColor[1] == null ? 255 : 255 - rgbColor[1]);
            this.commonAnodeLed.bluePin.pwmWrite(rgbColor[2] == null ? 255 : 255 - rgbColor[2]);
        } else {
            winston.warn('attempted to render on an uninitialized Common Anode LED');
        }
    }

    renderLEDNeopixel(hexColor: string): void {
        if (this.neopixelLed) {
            const c: string = hexColor;

            if (this.useGRBFormat) {
                const grbStr: string = `0x${c[3]}${c[4]}${c[1]}${c[2]}${c[5]}${c[6]}`;
                const grb: number = parseInt(grbStr, 16);
                this.neopixelLed.render(grb);
            } else {
                const rgbStr: string = `0x${c[1]}${c[2]}${c[3]}${c[4]}${c[5]}${c[6]}`;
                const rgb: number = parseInt(rgbStr, 16);
                this.neopixelLed.render(rgb);
            }
        } else {
            winston.warn('attempted to render on an uninitialized Neopixel LED');
        }
    }

    renderServoPosition(position: ServoPosition): void {
        if (this.servo) {
            this.servo.servoWrite(position);
        } else {
            winston.warn('attempted to render on an uninitialized servo');
        }
    }
}

export default RPi3Driver;
