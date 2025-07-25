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
import { Hardware } from './constants';
import { RPiBaseHardwareDriver } from './rpi-driver';
class GPIOLED {
    redPin;
    greenPin;
    bluePin;
    constructor(red, green, blue) {
        this.redPin = new Gpio(red, { mode: Gpio.OUTPUT });
        this.greenPin = new Gpio(green, { mode: Gpio.OUTPUT });
        this.bluePin = new Gpio(blue, { mode: Gpio.OUTPUT });
    }
}
class ws281xLED {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    neopixel;
    constructor(pin) {
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
    render(color) {
        const colors = new Uint32Array(1);
        colors[0] = color;
        this.neopixel.render(colors);
    }
}
class RPi4Driver extends RPiBaseHardwareDriver {
    commonAnodeLed;
    neopixelLed;
    useGRBFormat;
    servo;
    constructor() {
        super();
        this.useGRBFormat = false;
    }
    setupLEDCommonAnode(config) {
        const redPin = config['redPin'] ?? 19;
        const greenPin = config['greenPin'] ?? 13;
        const bluePin = config['bluePin'] ?? 12;
        winston.verbose(`💡 initializing ${Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this.commonAnodeLed = new GPIOLED(redPin, greenPin, bluePin);
        this.initializedHardware.add(Hardware.LED_COMMON_ANODE);
    }
    setupLEDNeopixel(config) {
        const pin = config['gpioPin'] ?? 12;
        winston.verbose(`💡 initializing ${Hardware.LED_NEOPIXEL} on pin ${pin}`);
        this.neopixelLed = new ws281xLED(pin);
        this.useGRBFormat = (config['useGRB'] ?? "false") == "true";
        this.initializedHardware.add(Hardware.LED_NEOPIXEL);
    }
    setupServo(config) {
        const pin = config['servoPin'] ?? 7;
        winston.verbose(`🦾 initializing ${Hardware.SERVO} on PIN ${pin}`);
        this.servo = new Gpio(pin, { mode: Gpio.OUTPUT });
        this.initializedHardware.add(Hardware.SERVO);
    }
    renderLEDCommonAnode(rgbColor) {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.redPin.pwmWrite(rgbColor[0] == null ? 255 : 255 - rgbColor[0]);
            this.commonAnodeLed.greenPin.pwmWrite(rgbColor[1] == null ? 255 : 255 - rgbColor[1]);
            this.commonAnodeLed.bluePin.pwmWrite(rgbColor[2] == null ? 255 : 255 - rgbColor[2]);
        }
        else {
            winston.warn('attempted to render on an uninitialized Common Anode LED');
        }
    }
    renderLEDNeopixel(hexColor) {
        if (this.neopixelLed) {
            const c = hexColor;
            if (this.useGRBFormat) {
                const grbStr = `0x${c[3]}${c[4]}${c[1]}${c[2]}${c[5]}${c[6]}`;
                const grb = parseInt(grbStr, 16);
                this.neopixelLed.render(grb);
            }
            else {
                const rgbStr = `0x${c[1]}${c[2]}${c[3]}${c[4]}${c[5]}${c[6]}`;
                const rgb = parseInt(rgbStr, 16);
                this.neopixelLed.render(rgb);
            }
        }
        else {
            winston.warn('attempted to render on an uninitialized Neopixel LED');
        }
    }
    renderServoPosition(position) {
        if (this.servo) {
            this.servo.servoWrite(position);
        }
        else {
            winston.warn('attempted to render on an uninitialized servo');
        }
    }
}
export default RPi4Driver;
