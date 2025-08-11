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
import { Hardware } from './constants';
import { RPiBaseHardwareDriver } from './rpi-driver';
import { sleep } from './utils';
class GPIOLED {
    constructor(red, green, blue) {
        this.redPin = new Gpio(red, { mode: Gpio.OUTPUT });
        this.greenPin = new Gpio(green, { mode: Gpio.OUTPUT });
        this.bluePin = new Gpio(blue, { mode: Gpio.OUTPUT });
    }
}
class SPILED {
    constructor(spiInterface) {
        const i = spiInterface || "/dev/spidev0.0";
        this.spi = SPI.initialize(i);
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
        winston.verbose(`rendering LED color ${color} (RGB: ${r} ${g} ${b})`);
        const bitstream = SPILED.rgbToSpiBitstream(r, g, b);
        this.spi.transfer(bitstream, bitstream.length, function (e, d) {
            if (e) {
                throw e;
            }
        });
        // sleep for 9 microseconds
        sleep(9 / 1000);
    }
}
SPILED.HIGH = 0xF8; // possibles: F0, F8, FC
SPILED.LOW = 0xC0; // possibles: C0
SPILED.FREQ = 6400000; // possibles: 3200000, 6400000; pi5neo uses: spi_speed_khz (800) * 1024 * 8  = 6553600
class RPi5Driver extends RPiBaseHardwareDriver {
    constructor() {
        super();
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
        const spiInterface = config['spiInterface'] ?? '/dev/spidev0.0';
        winston.verbose(`💡 initializing ${Hardware.LED_NEOPIXEL} on SPI ${spiInterface}`);
        this.neopixelLed = new SPILED(spiInterface);
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
            this.neopixelLed.render(hexColor);
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
export default RPi5Driver;
//# sourceMappingURL=rpi5-driver.js.map