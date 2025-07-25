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
const pi_spi_1 = __importDefault(require("pi-spi"));
const constants_1 = require("./constants");
const rpi_driver_1 = require("./rpi-driver");
const utils_1 = require("./utils");
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
class SPILED {
    // this class is based on pi5neo.py
    // https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
    spi;
    static HIGH = 0xF8; // possibles: F0, F8, FC
    static LOW = 0xC0; // possibles: C0
    static FREQ = 6400000; // possibles: 3200000, 6400000; pi5neo uses: spi_speed_khz (800) * 1024 * 8  = 6553600
    constructor(spiInterface) {
        const i = spiInterface || "/dev/spidev0.0";
        this.spi = pi_spi_1.default.initialize(i);
        this.spi.clockSpeed(SPILED.FREQ);
    }
    static bitMask(byte, index) {
        return (byte & (1 << (7 - index))) != 0;
    }
    static byteToBitstream(byte) {
        // Initialize with low bits
        const bitstream = Array(8).fill(SPILED.LOW);
        for (let i = 0; i < 8; i++) {
            if (SPILED.bitMask(byte, i)) {
                // Set high bits for '1'
                bitstream[i] = SPILED.HIGH;
            }
        }
        return bitstream;
    }
    static rgbToSpiBitstream(red, green, blue) {
        const red_bits = SPILED.byteToBitstream(red);
        const green_bits = SPILED.byteToBitstream(green);
        const blue_bits = SPILED.byteToBitstream(blue);
        const bitstream = Buffer.from(green_bits.concat(red_bits).concat(blue_bits));
        return bitstream;
    }
    /**
     * Render the LED a specified color.
     * @param {string} color The color to shine the LED, specified as a string of hexadecimal digits with no
     * leading '0x' or '#' in RRGGBB format.
     */
    render(color) {
        const c = parseInt(color, 16);
        const r = (c & 0xFF0000) >> 16;
        const g = (c & 0x00FF00) >> 8;
        const b = (c & 0x0000FF) >> 0;
        winston_1.default.verbose(`rendering LED color ${color} (RGB: ${r} ${g} ${b})`);
        const bitstream = SPILED.rgbToSpiBitstream(r, g, b);
        this.spi.transfer(bitstream, bitstream.length, function (e, d) {
            if (e) {
                throw e;
            }
        });
        // sleep for 9 microseconds
        (0, utils_1.sleep)(9 / 1000);
    }
}
class RPi5Driver extends rpi_driver_1.RPiBaseHardwareDriver {
    commonAnodeLed;
    neopixelLed;
    servo;
    constructor() {
        super();
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
        const spiInterface = config['spiInterface'] ?? '/dev/spidev0.0';
        winston_1.default.verbose(`💡 initializing ${constants_1.Hardware.LED_NEOPIXEL} on SPI ${spiInterface}`);
        this.neopixelLed = new SPILED(spiInterface);
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
            this.neopixelLed.render(hexColor);
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
exports.default = RPi5Driver;
