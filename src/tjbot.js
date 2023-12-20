/* eslint-disable import/extensions */
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

// node modules
import temp from 'temp';
import Promise from 'bluebird';
import fs from 'fs';
import colorToHex from 'colornames';
import cm from 'color-model';
import winston from 'winston';
import { once } from 'events';
import TOML from '@iarna/toml';

// hardware modules
import Mic from 'mic';
import { Raspistill } from 'node-raspistill';
import ws281x from 'rpi-ws281x-native';
import { Gpio } from 'pigpio';
import SoundPlayer from 'sound-player';

// watson modules
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1';
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1';

/**
* Class representing a TJBot
*/
class TJBot {
    /**
     * TJBot library version
     * @readonly
    */
    static VERSION = 'v3.0.0';

    /**
     * TJBot capabilities
     * @readonly
     * @enum {string}
     */
    static Capability = {
        LISTEN: 'listen',
        LOOK: 'look',
        SHINE: 'shine',
        SPEAK: 'speak',
        WAVE: 'wave',
    };

    /**
     * TJBot hardware
     * @readonly
     * @enum {string}
     */
    static Hardware = {
        CAMERA: 'camera',
        LED_NEOPIXEL: 'led_neopixel',
        LED_COMMON_ANODE: 'led_common_anode',
        MICROPHONE: 'microphone',
        SERVO: 'servo',
        SPEAKER: 'speaker',
    };

    /**
     * TJBot Watson services
     * @readonly
     * @enum {string}
     */
    static Services = {
        SPEECH_TO_TEXT: 'speech_to_text',
        TEXT_TO_SPEECH: 'text_to_speech',
    };

    /**
     * TJBot servo motor stop positions
     * @readonly
     * @enum {int}
     */
    static Servo = {
        ARM_BACK: 500,
        ARM_UP: 1400,
        ARM_DOWN: 2300,
    };

    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @param  {object} configuration   Configuration for the TJBot. See TJBot.DEFAULT_CONFIG for all configuration options.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM Watson services.
     * @return {TJBot} instance of the TJBot class
     */
    constructor(configFile = 'tjbot.toml', credentialsFile = '') {
        this.config = TJBot._loadTJBotConfig(configFile);

        // set up logging
        winston.configure({
            level: this.config.Log.level || 'info',
            format: winston.format.simple(),
            transports: [
                new winston.transports.Console(),
            ],
        });

        // automatically track and clean up temporary files
        temp.track();

        // keep track of IBM Cloud service credentials
        if (credentialsFile !== '') {
            process.env.IBM_CREDENTIALS_FILE = credentialsFile;
        }

        winston.info('Hello from TJBot!');
        winston.verbose(`TJBot library version ${TJBot.VERSION}`);
        winston.silly(`TJBot configuration: ${JSON.stringify(this.config)}`);
    }

    static _loadTJBotConfig(configFile) {
        // load base config
        let baseConfig = '';
        let userConfig = '';

        try {
            const data = fs.readFileSync('src/tjbot.default.toml', 'utf8');
            baseConfig = TOML.parse(data);
        } catch (err) {
            throw new Error('unable to read tjbot default configuration from tjbot.default.toml');
        }

        try {
            if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {
                const data = fs.readFileSync(configFile, 'utf8');
                userConfig = TOML.parse(data);
            }
        } catch (err) {
            throw new Error(`unable to read tjbot configuration from ${configFile}`);
        }

        const config = { ...baseConfig, ...userConfig };
        return config;
    }

    /**
     * @param  {array} hardware List of hardware peripherals attached to TJBot.
     * @see {@link #TJBot+Hardware} for a list of supported hardware.
     * @async
     */
    async initialize(hardware) {
        // set up the hardware
        if (hardware === undefined) {
            throw new Error('must define a hardware configuration for TJBot');
        }
        if (!Array.isArray(hardware)) {
            throw new Error('hardware must be an array');
        }

        winston.info(`Initializing TJBot with ${hardware}`);

        hardware.forEach((device) => {
            switch (device) {
            case TJBot.Hardware.CAMERA:
                this._setupCamera();
                break;

            case TJBot.Hardware.LED_NEOPIXEL:
                this._setupLEDNeopixel(this.config.Shine.neopixel.gpioPin);
                break;

            case TJBot.Hardware.LED_COMMON_ANODE:
                this._setupLEDCommonAnode(
                    this.config.Shine.commonAnode.redPin,
                    this.config.Shine.commonAnode.greenPin,
                    this.config.Shine.commonAnode.bluePin,
                );
                break;

            case TJBot.Hardware.MICROPHONE:
                this._setupMicrophone();
                break;

            case TJBot.Hardware.SERVO:
                this._setupServo(this.config.Wave.servoPin);
                break;

            case TJBot.Hardware.SPEAKER:
                this._setupSpeaker();
                break;

            default:
                break;
            }
        }, this);
    }

    /** ------------------------------------------------------------------------ */
    /** INTERNAL HARDWARE & WATSON SERVICE INITIALIZATION                        */
    /** ------------------------------------------------------------------------ */

    /**
    * Configure the camera hardware.
    * @private
    */
    _setupCamera() {
        winston.verbose(`initializing ${TJBot.Hardware.CAMERA}`);

        this._camera = new Raspistill({
            width: this.config.See.camera.width,
            height: this.config.See.camera.height,
            noPreview: true,
            encoding: 'jpg',
            outputDir: './',
            verticalFlip: this.config.See.camera.verticalFlip,
            horizontalFlip: this.config.See.camera.horizontalFlip,
            time: 1,
        });
    }

    /**
    * Configure the Neopixel LED hardware.
    * @param {int} gpioPin The GPIO pin number to which the LED is connected.
    * @private
    */
    _setupLEDNeopixel(gpioPin) {
        winston.verbose(`initializing ${TJBot.Hardware.LED_NEOPIXEL} on PIN ${gpioPin}`);

        // init with 1 LED
        this._neopixelLed = ws281x;
        this._neopixelLed.init(1, {
            gpioPin,
        });

        // capture 'this' context
        const self = this;

        // reset the LED before the program exits
        process.on('SIGINT', () => {
            self._neopixelLed.reset();
            process.nextTick(() => {
                process.exit(0);
            });
        });
    }

    /**
    * Configure the common anode RGB LED hardware.
    * @param {int} redPin The pin number to which the led red pin is connected.
    * @param {int} greenPin The pin number to which the led green pin is connected.
    * @param {int} bluePin The pin number to which the led blue pin is connected.
    * @private
    */
    _setupLEDCommonAnode(redPin, greenPin, bluePin) {
        winston.verbose(`initializing ${TJBot.Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);

        this._commonAnodeLed = {
            redPin: new Gpio(redPin, {
                mode: Gpio.OUTPUT,
            }),
            greenPin: new Gpio(greenPin, {
                mode: Gpio.OUTPUT,
            }),
            bluePin: new Gpio(bluePin, {
                mode: Gpio.OUTPUT,
            }),
        };
    }

    /**
     * Configure the microphone for speech recognition.
     * @private
     */
    _setupMicrophone() {
        winston.verbose(`initializing ${TJBot.Hardware.MICROPHONE}`);

        const micParams = {
            rate: '16000',
            channels: '1',
            debug: false,
            exitOnSilence: 6,
        };

        if (this.config.Listen.microphoneDeviceId) {
            micParams.device = this.config.Listen.microphoneDeviceId;
        }

        // create the microphone
        this._mic = Mic(micParams);

        // (re-)create the mic audio stream and pipe it to STT
        this._micInputStream = this._mic.getAudioStream();

        this._micInputStream.on('startComplete', () => {
            winston.verbose('microphone started');
        });

        this._micInputStream.on('pauseComplete', () => {
            winston.verbose('microphone paused');
        });

        // log errors in the mic input stream
        this._micInputStream.on('error', (err) => {
            winston.error('the microphone input stream experienced an error', err);
        });

        this._micInputStream.on('processExitComplete', () => {
            winston.verbose('microphone exit');
        });

        // ignore silence
        this._micInputStream.on('silence', () => {
            winston.verbose('microphone silence');
        });
    }

    /**
     * Configure the servo module for the given pin number.
     * @param  {int} pin The pin number to which the servo is connected.
     * @private
     */
    _setupServo(pin) {
        winston.verbose(`initializing ${TJBot.Hardware.SERVO} on PIN ${pin}`);

        this._motor = new Gpio(pin, {
            mode: Gpio.OUTPUT,
        });
    }

    /**
     * Configure the speaker.
     * @private
     */
    _setupSpeaker() {
        winston.verbose(`initializing ${TJBot.Hardware.SPEAKER}`);
        this._soundplayer = SoundPlayer;
    }

    /**
     * Instantiate the specified Watson service.
     * @param {string} service The name of the service. Valid names are defined in TJBot.services.
     * @param {string} version The version of the service (e.g. "2018-09-20"). If null, the default version will be used.
     * @private
     */
    _createServiceAPI(service) {
        winston.verbose(`initializing ${service} service`);

        switch (service) {
        case TJBot.Service.SPEECH_TO_TEXT: {
            // https://cloud.ibm.com/apidocs/speech-to-text
            this._stt = new SpeechToTextV1({});
            break;
        }

        case TJBot.Service.TEXT_TO_SPEECH: {
            // https://cloud.ibm.com/apidocs/text-to-speech
            this._tts = new TextToSpeechV1({});
            break;
        }

        default:
            break;
        }
    }

    /**
     * Assert that TJBot is able to perform a specified capability. Instantiates Watson
     * services as needed.
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     * @private
     */
    _assertCapability(capability) {
        switch (capability) {
        case TJBot.Capability.LISTEN:
            if (!this._mic) {
                throw new Error(
                    'TJBot is not configured to listen. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.MICROPHONE} hardware in the TJBot initialize() method.`,
                );
            }
            if (!this._stt) {
                this._createServiceAPI(TJBot.Service.SPEECH_TO_TEXT);
            }
            break;

        case TJBot.Capability.LOOK:
            if (!this._camera) {
                throw new Error(
                    'TJBot is not configured to look. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.CAMERA} hardware in the TJBot initialize() method.`,
                );
            }
            break;

        case TJBot.Capability.SHINE:
            // one LED should be defined
            if (!this._neopixelLed && !this._commonAnodeLed) {
                throw new Error(
                    'TJBot is not configured with an LED. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.LED_NEOPIXEL} or ${TJBot.Hardware.LED_COMMON_ANODE} `
                        + 'hardware in the TJBot initialize() method.',
                );
            }
            break;

        case TJBot.Capability.SPEAK:
            if (!this._soundplayer) {
                throw new Error(
                    'TJBot is not configured to speak. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.SPEAKER} hardware in the TJBot initialize() method.`,
                );
            }
            if (!this._tts) {
                this._createServiceAPI(TJBot.Service.TEXT_TO_SPEECH);
            }
            break;

        case TJBot.Capability.WAVE:
            if (!this._motor) {
                throw new Error(
                    'TJBot is not configured with an arm. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.SERVO} hardware in the TJBot initialize() method.`,
                );
            }
            break;

        default:
            break;
        }
    }

    /** ------------------------------------------------------------------------ */
    /** UTILITY METHODS                                                          */
    /** ------------------------------------------------------------------------ */

    /**
     * Put TJBot to sleep.
     * @param {int} sec Number of seconds to sleep for.
     */
    static sleep(sec) {
        const msec = sec * 1000;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, msec);
    }

    /** ------------------------------------------------------------------------ */
    /** LISTEN                                                                   */
    /** ------------------------------------------------------------------------ */

    /**
     * Listen for a spoken utterance.
     * @async
     */
    async listen() {
        // make sure we can listen
        this._assertCapability(TJBot.Capability.LISTEN);

        // lazy create the sttTextStream
        if (this._sttTextStream === undefined) {
            // initialize the microphone because if stopListening() was called, we don't seem to
            // be able to re-use the microphone twice
            this._setupMicrophone();

            // create the microphone -> STT recognizer stream
            // see this page for additional documentation on the STT configuration parameters:
            // https://cloud.ibm.com/apidocs/speech-to-text?code=node#recognize-audio-websockets-
            const params = {
                objectMode: false,
                contentType: 'audio/l16; rate=16000; channels=1',
                model: `${this.config.Listen.language}_BroadbandModel`,
                inactivityTimeout: this.config.Listen.inactivityTimeout || 60,
                interimResults: true,
                backgroundAudioSuppression: this.config.Listen.backgroundAudioSuppression || 0.0,
            };

            winston.silly(`recognizeUsingWebSocket() params: ${JSON.stringify(params)}`);

            // Create the stream.
            this._recognizeStream = this._stt.recognizeUsingWebSocket(params);
            this._recognizeStream.setEncoding('utf8');

            // create the mic -> STT recognizer -> text stream
            this._sttTextStream = this._micInputStream.pipe(this._recognizeStream);
            this._sttTextStream.setEncoding('utf8');

            // start the microphone
            this._mic.start();

            // handle errors
            this._sttTextStream.on('error', (err) => {
                winston.error('an error occurred in the STT text stream', err);
            });
        }

        const fd = this._sttTextStream;
        const end = new Promise((resolve) => {
            fd.once('data', resolve);
        });
        const transcript = await end;

        winston.info(`TJBot heard: "${transcript.trim()}"`);
        return transcript.trim();
    }

    /**
     * Internal method for pausing listening, used when
     * we want to play a sound but we don't want to assert
     * the 'listen' capability.
     * @private
     */
    _pauseListening() {
        if (this._mic !== undefined) {
            winston.verbose('listening paused');
            this._mic.pause();
        }
    }

    /**
     * Internal method for resuming listening, used when
     * we want to play a sound but we don't want to assert
     * the 'listen' capability.
     * @private
     */
    _resumeListening() {
        if (this._mic !== undefined) {
            winston.verbose('listening resumed');
            this._mic.resume();
        }
    }

    /** ------------------------------------------------------------------------ */
    /** LOOK                                                                      */
    /** ------------------------------------------------------------------------ */

    /**
     * Capture an image and save it in the given path.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @async
     */
    async look(filePath = '') {
        this._assertCapability(TJBot.Capability.LOOK);
        return this._takePhoto(filePath);
    }

    /**
     * Internal method to capture an image at the given path. Used to avoid triggering
     * the check for an apikey for Watson Visual Recognition in _assertCapability()
     * during testing.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @private
     * @async
     */
    async _takePhoto(filePath = '') {
        let fp = filePath;
        let path = '';
        let name = '';

        // if no file path provided, save to temp location
        if (fp === '') {
            fp = temp.path({
                prefix: 'tjbot',
                suffix: '.jpg',
            });
        }

        winston.verbose(`capturing image at path: ${fp}`);
        path = fp.lastIndexOf('/') > 0 ? fp.substring(0, fp.lastIndexOf('/')) : '.'; // save to current dir if no directory provided.
        name = fp.substring(fp.lastIndexOf('/') + 1);
        name = name.replace('.jpg', ''); // the node raspistill lib already adds encoding .jpg to file.
        winston.silly(`image path: ${path}, image filename: ${name}`);

        // set the configuration options, which may have changed since the camera was initialized
        this._camera.setOptions({
            outputDir: path,
            fileName: name,
            width: this.config.See.camera.width,
            height: this.config.See.camera.height,
            verticalFlip: this.config.See.camera.verticalFlip,
            horizontalFlip: this.config.See.camera.horizontalFlip,
        });

        winston.silly(`camera options: ${JSON.stringify(this._camera.getOptions())}`);

        try {
            await this._camera.takePhoto();
            return fp;
        } catch (err) {
            winston.error('error taking picture', err);
            throw err;
        }
    }

    /** ------------------------------------------------------------------------ */
    /** SHINE                                                                    */
    /** ------------------------------------------------------------------------ */

    /**
     * Change the color of the LED.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     */
    shine(color) {
        this._assertCapability(TJBot.Capability.SHINE);

        // normalize the color
        const c = this._normalizeColor(color);

        // shine! will shine on both LEDs if they are both set up
        if (this._commonAnodeLed) {
            this._renderCommonAnodeLed(c);
        }

        if (this._neopixelLed) {
            const colors = new Uint32Array(1);

            if (this.config.Shine.neopixel.grbFormat) {
                // convert to the 0xGGRRBB format for the LED
                const grb = `0x${c[3]}${c[4]}${c[1]}${c[2]}${c[5]}${c[6]}`;
                winston.verbose(`shining my LED to GRB color ${grb}`);
                colors[0] = parseInt(grb, 16);
            } else {
                // convert to the 0xRRGGBB format for the LED
                const rgb = `0x${c[1]}${c[2]}${c[3]}${c[4]}${c[5]}${c[6]}`;
                winston.verbose(`shining my LED to RGB color ${rgb}`);
                colors[0] = parseInt(rgb, 16);
            }

            this._neopixelLed.render(colors);
        }
    }

    /**
     * Pulse the LED a single time.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @param {float=} duration The duration the pulse should last. The duration should be in
     * the range [0.5, 2.0] seconds.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     * @async
     */
    async pulse(color, duration = 1.0) {
        this._assertCapability(TJBot.Capability.SHINE);

        if (duration < 0.5) {
            throw new Error('TJBot does not recommend pulsing for less than 0.5 seconds.');
        }
        if (duration > 2.0) {
            throw new Error('TJBot does not recommend pulsing for more than 2 seconds.');
        }

        // number of easing steps
        const numSteps = 20;

        // quadratic in-out easing
        const easeInOutQuad = (t, b, c, d) => {
            if ((t / d / 2) < 1) {
                return (c / 2) * (t / d) * (t / d) + b;
            }
            return (-c / 2) * ((t - 1) * (t - 3) - 1) + b;
        };

        let ease = [];
        for (let i = 0; i < numSteps; i += 1) {
            ease.push(i);
        }

        ease = ease.map((x, i) => easeInOutQuad(i, 0, 1, ease.length));

        // normalize to 'duration' msec
        ease = ease.map((x) => Math.round(x * duration * 1000));

        // convert to deltas
        const easeDelays = [];
        for (let i = 0; i < ease.length - 1; i += 1) {
            easeDelays[i] = ease[i + 1] - ease[i];
        }

        // color ramp
        const rgb = this._normalizeColor(color).slice(1); // remove the #
        const hex = new cm.HexRgb(rgb);

        const colorRamp = [];
        for (let i = 0; i < numSteps / 2; i += 1) {
            const l = 0.0 + (i / (numSteps / 2)) * 0.5;
            colorRamp[i] = hex.toHsl().lightness(l).toRgb().toHexString()
                .replace('#', '0x');
        }

        // perform the ease
        for (let i = 0; i < easeDelays.length; i += 1) {
            const c = i < colorRamp.length
                ? colorRamp[i]
                : colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
            this.shine(c);
            // eslint-disable-next-line no-await-in-loop
            TJBot.sleep(easeDelays[i]);
        }
    }

    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     */
    shineColors() {
        if (this._shineColors === undefined) {
            this._shineColors = colorToHex.all().map((elt) => elt.name);
        }
        return this._shineColors;
    }

    /**
     * Get a random color.
     * @return {string} Random named color.
     */
    randomColor() {
        const colors = this.shineColors();
        const randIdx = Math.floor(Math.random() * colors.length);
        const randColor = colors[randIdx];

        return randColor;
    }

    /**
     * Normalize the given color to #RRGGBB.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @return {string} Hex string corresponding to the given color (e.g. "#RRGGBB")
     * @private
     */
    _normalizeColor(color) {
        let normColor = color;

        // assume undefined == "off"
        if (normColor === undefined) {
            normColor = 'off';
        }

        // is this "on" or "off"?
        if (normColor === 'on') {
            normColor = 'FFFFFF';
        } else if (normColor === 'off') {
            normColor = '000000';
        } else if (normColor === 'random') {
            normColor = this.randomColor();
        }

        // strip prefixes if they are present
        if (normColor.startsWith('0x')) {
            normColor = normColor.slice(2);
        }

        if (normColor.startsWith('#')) {
            normColor = normColor.slice(1);
        }

        // is this a hex number or a named color?
        const isHex = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i;
        let rgb;
        if (!isHex.test(normColor)) {
            rgb = colorToHex(normColor);
        } else {
            rgb = normColor;
        }

        // did we get something back?
        if (rgb === undefined) {
            throw new Error(`TJBot did not understand the specified color "${color}"`);
        }

        // prefix rgb with # in case it's not
        if (!rgb.startsWith('#')) {
            rgb = `#${rgb}`;
        }

        // throw an error if we didn't understand this color
        if (rgb.length !== 7) {
            throw new Error(`TJBot did not understand the specified color "${color}"`);
        }

        return rgb;
    }

    /**
    * Convert hex color code to RGB value.
    * @param {string} hexColor Hex color code
    * @return {array} RGB color (e.g. (255, 128, 128))
    * @private
    */
    // eslint-disable-next-line class-methods-use-this
    _convertHexToRgbColor(hexColor) {
        return hexColor.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,
            (m, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
            .substring(1).match(/.{2}/g)
            .map((x) => parseInt(x, 16));
    }

    /**
    * Render the given rgb color for the common anode led.
    * @param {string} hexColor Color in hex format
    * @private
    */
    _renderCommonAnodeLed(hexColor) {
        const rgb = this._convertHexToRgbColor(hexColor);
        this._commonAnodeLed.redPin.pwmWrite(rgb[0] == null ? 255 : 255 - rgb[0]);
        this._commonAnodeLed.greenPin.pwmWrite(rgb[1] == null ? 255 : 255 - rgb[1]);
        this._commonAnodeLed.bluePin.pwmWrite(rgb[2] == null ? 255 : 255 - rgb[2]);
    }

    /** ------------------------------------------------------------------------ */
    /** SPEAK                                                                    */
    /** ------------------------------------------------------------------------ */

    /**
     * Speak a message.
     * @param {string} message The message to speak.
     * @async
     */
    async speak(message) {
        this._assertCapability(TJBot.Capability.SPEAK);

        // make sure we're trying to say something
        if (message === undefined || message === '') {
            winston.error('TJBot tried to speak an empty message.');
            return; // exit if there's nothing to say!
        }

        winston.verbose(`TJBot speaking with voice ${this.config.Speak.voice}`);

        const params = {
            text: message,
            voice: this.config.Speak.voice,
            accept: 'audio/wav',
        };

        const info = temp.openSync('tjbot');
        const response = await this._tts.synthesize(params);

        // pipe the audio buffer to a file
        winston.silly('writing audio buffer to temp file', info.path);
        const fd = fs.createWriteStream(info.path);
        response.result.pipe(fd);

        // wait for the pipe to finish writing
        const end = new Promise((resolve, reject) => {
            fd.on('close', resolve);
            fd.on('error', reject);
        });
        await end;

        // now play it
        winston.info(`TJBot speaking: ${message}`);
        await this.play(info.path);
    }

    /**
     * Play a sound at the specified path.
     * @param {string} soundFile The path to the sound file to be played.
     * @async
     */
    async play(soundFile) {
        // pause listening while we play a sound -- using the internal
        // method to avoid a capability check (and potential fail if the TJBot
        // isn't configured to listen)
        this._pauseListening();

        // if we don't have a speaker, throw an error
        if (this._soundplayer === undefined) {
            throw new Error('unable to play audio, TJBot hardware doesn\'t include a "speaker"');
        }

        // initialize soundplayer lib
        const params = {
            filename: soundFile,
            gain: 100,
            debug: true,
            player: 'aplay',
            device: this.config.Speak.device,
        };
        const player = new this._soundplayer(params);

        winston.silly('playing audio with parameters: ', params);

        // capture 'this' context
        const self = this;
        player.on('complete', () => {
            winston.silly('audio playback finished');

            // resume listening
            self._resumeListening();
        });

        player.on('error', (err) => {
            winston.error('error occurred while playing audio', err);
        });

        // play the audio
        player.play(soundFile);

        // wait for the audio to finish playing, either by completing playback or by throwing an error
        await Promise.race([once(player, 'complete'), once(player, 'error')]);
    }

    /** ------------------------------------------------------------------------ */
    /** WAVE                                                                     */
    /** ------------------------------------------------------------------------ */

    /**
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.armBack()
     */
    armBack() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston.info("Moving TJBot's arm back");
        this._motor.servoWrite(TJBot.SERVO.ARM_BACK);
    }

    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston.info("Raising TJBot's arm");
        this._motor.servoWrite(TJBot.SERVO.ARM_UP);
    }

    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston.info("Lowering TJBot's arm");
        this._motor.servoWrite(TJBot.SERVO.ARM_DOWN);
    }

    /**
     * Waves TJBots's arm once.
     */
    async wave() {
        this._assertCapability(TJBot.Capability.WAVE);
        winston.info("Waving TJBot's arm");

        const delay = 200;

        this._motor.servoWrite(TJBot.SERVO.ARM_UP);
        TJBot.sleep(delay);

        this._motor.servoWrite(TJBot.SERVO.ARM_DOWN);
        TJBot.sleep(delay);

        this._motor.servoWrite(TJBot.SERVO.ARM_UP);
        TJBot.sleep(delay);
    }
}

/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */

/**
 * Export TJBot!
 */
export default TJBot;
