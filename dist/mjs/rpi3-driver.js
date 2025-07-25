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
const winston_1 = __importDefault(require("winston"));
const pigpio_1 = require("pigpio");
const rpi_ws281x_native_1 = __importDefault(require("rpi-ws281x-native"));
const constants_1 = require("./constants");
const rpi_driver_1 = require("./rpi-driver");
class GPIOLED {
    redPin;
    greenPin;
    bluePin;
    constructor(red, green, blue) {
        this.redPin = new pigpio_1.Gpio(red, { mode: pigpio_1.Gpio.OUTPUT });
        this.greenPin = new pigpio_1.Gpio(green, { mode: pigpio_1.Gpio.OUTPUT });
        this.bluePin = new pigpio_1.Gpio(blue, { mode: pigpio_1.Gpio.OUTPUT });
    }
}
class ws281xLED {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    neopixel;
    constructor(pin) {
        this.neopixel = rpi_ws281x_native_1.default;
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
class RPi3Driver extends rpi_driver_1.RPiBaseHardwareDriver {
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
        winston_1.default.verbose(`💡 initializing ${constants_1.Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this.commonAnodeLed = new GPIOLED(redPin, greenPin, bluePin);
        this.initializedHardware.add(constants_1.Hardware.LED_COMMON_ANODE);
    }
    setupLEDNeopixel(config) {
        const pin = config['gpioPin'] ?? 12;
        winston_1.default.verbose(`💡 initializing ${constants_1.Hardware.LED_NEOPIXEL} on pin ${pin}`);
        this.neopixelLed = new ws281xLED(pin);
        this.useGRBFormat = (config['useGRB'] ?? "false") == "true";
        this.initializedHardware.add(constants_1.Hardware.LED_NEOPIXEL);
    }
    setupServo(config) {
        const pin = config['servoPin'] ?? 7;
        winston_1.default.verbose(`🦾 initializing ${constants_1.Hardware.SERVO} on PIN ${pin}`);
        this.servo = new pigpio_1.Gpio(pin, { mode: pigpio_1.Gpio.OUTPUT });
        this.initializedHardware.add(constants_1.Hardware.SERVO);
    }
    renderLEDCommonAnode(rgbColor) {
        if (this.commonAnodeLed) {
            this.commonAnodeLed.redPin.pwmWrite(rgbColor[0] == null ? 255 : 255 - rgbColor[0]);
            this.commonAnodeLed.greenPin.pwmWrite(rgbColor[1] == null ? 255 : 255 - rgbColor[1]);
            this.commonAnodeLed.bluePin.pwmWrite(rgbColor[2] == null ? 255 : 255 - rgbColor[2]);
        }
        else {
            winston_1.default.warn('attempted to render on an uninitialized Common Anode LED');
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
            winston_1.default.warn('attempted to render on an uninitialized Neopixel LED');
        }
    }
    renderServoPosition(position) {
        if (this.servo) {
            this.servo.servoWrite(position);
        }
        else {
            winston_1.default.warn('attempted to render on an uninitialized servo');
        }
    }
}
exports.default = RPi3Driver;
