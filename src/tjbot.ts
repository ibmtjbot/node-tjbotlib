/**
 * Copyright 2016-2025 IBM Corp. All Rights Reserved.
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

// internal classes
import RPiDetect from './rpi-detect';
import { RPiHardwareDriver } from './rpi-driver';
import RPi3Driver from './rpi3-driver';
import RPi4Driver from './rpi4-driver';
import RPi5Driver from './rpi5-driver';

// node modules
import temp from 'temp';
import Promise from 'bluebird';
import fs from 'fs';
import colorToHex from 'colornames';
import cm from 'color-model';
import winston from 'winston';
import { once } from 'events';
import TOML from '@iarna/toml';
import { easeInOutQuad } from 'js-easing-functions';
import { resolve } from 'import-meta-resolve';

// watson modules
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
import { Capability, Hardware, WatsonService } from './constants.js';

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
     * TJBot configuration
     */
    config: TOML.JsonMap;

    /**
     * Raspberry Pi model on which TJBot is running
     * @example "Raspberry Pi 5"
     */
    rpiModel: string;

    /**
     * Raspberry Pi hardware driver
     */
    rpiDriver: RPiHardwareDriver;

    /**
     * Watson STT service
     */
    stt: SpeechToTextV1;
    sttTextStream: any;

    /**
     * Watson TTS service
     */
    tts: TextToSpeechV1;

    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @constructor
     * @param  {string=} configFile      (optional) Configuration for the TJBot.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM AI services.
     */
    constructor(configFile: string | undefined = 'tjbot.toml', credentialsFile: string | undefined = 'ibm-credentials.env') {
        this.config = TJBot._loadTJBotConfig(configFile);

        // set up logging
        winston.configure({
            level: this.config['Log']['level'] || 'info',
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

        // figure out which RPi we're running on
        this.rpiModel = RPiDetect.model();

        if (this.rpiModel.startsWith('Raspberry Pi 3')) {
            this.rpiDriver = new RPi3Driver();
        } else if (this.rpiModel.startsWith('Raspberry Pi 4')) {
            this.rpiDriver = new RPi4Driver();
        } else if (this.rpiModel.startsWith('Raspberry Pi 5')) {
            this.rpiDriver = new RPi5Driver();
        } else {
            winston.warn('TJBot is running on unsupported Raspberry Pi hardware. Restorting to RPi3 hardware driver, but errors may occur.');
            this.rpiDriver = new RPi3Driver();
        }

        // say hello
        winston.info(`👋 Hello from TJBot! Running on ${this.rpiModel}`);
        winston.verbose(`🤖 TJBot library version ${TJBot.VERSION}`);
        winston.debug(`🤖 TJBot configuration: ${JSON.stringify(this.config)}`);
    }

    /**
     * Helper method to load user-specific configuration from the user-facing TJBot configuration file.
     * @param  {string=} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {TOML.JsonMap} The TOML configuration.
     */
    static loadUserConfig(configFile: string | undefined = 'tjbot.toml'): TOML.JsonMap {
        let config: TOML.JsonMap = {};

        try {
            const configData: string = fs.readFileSync(configFile, 'utf8');
            config = TOML.parse(configData);
        } catch (err) {
            throw new Error(`unable to read TOML from ${configFile}: ${err}`);
        }

        return config;
    }

    /**
     * Helper method to load recipe-specific configuration from the user-facing TJBot configuration file.
     * @param  {string=} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {TOML.JsonMap} The TOML configuration specified in the [Recipe] section.
     */
    static loadRecipeConfig(configFile: string | undefined = 'tjbot.toml'): TOML.AnyJson {
        return TJBot.loadUserConfig(configFile).Recipe;
    }

    /**
     * Internal helper method to load TJBot's default TOML configuration from a specified file.
     * Do not use this method within TJBot recipes. Instead, use `TJBot.loadUserConfig()`.
     * @private
     * @param  {string=} configFile   Path to the TOML file to load.
     * @return {TOML.JsonMap} The TOML configuration.
     */
    static _loadInternalConfigFromTOML(configFile: string | undefined = './tjbot.default.toml'): TOML.JsonMap {
        const configPath: string = resolve(configFile, import.meta.url);
        let config: TOML.JsonMap = {};

        try {
            const configData: string = fs.readFileSync(new URL(configPath), 'utf8');
            config = TOML.parse(configData);
        } catch (err) {
            throw new Error(`unable to read TOML from ${configFile}: ${err}`);
        }

        return config;
    }

    /**
    * Load TJBot's configuration from TOML files.
    * @private
    * @param  {string} configFile   Path to the TOML file to load.
    */
    static _loadTJBotConfig(configFile: string) {
        // load base config
        const baseConfig: TOML.JsonMap = TJBot._loadInternalConfigFromTOML();
        let userConfig: TOML.JsonMap = {};

        try {
            if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {
                userConfig = TJBot.loadUserConfig(configFile);
            }
        } catch (err) {
            throw new Error(`unable to read tjbot configuration from ${configFile}: ${err}`);
        }

        const config: TOML.JsonMap = { ...baseConfig, ...userConfig };
        return config;
    }

    /**
     * @param  {array} hardware List of hardware peripherals attached to TJBot.
     * @see {@link #TJBot+Hardware} for a list of supported hardware.
     * @async
     */
    async initialize(hardware: Hardware[]) {
        // set up the hardware
        winston.info(`🤖 Initializing TJBot with ${hardware.join(', ')}`);

        hardware.forEach((device) => {
            switch (device) {
                case Hardware.CAMERA:
                {
                    const config: TOML.AnyJson = this.config['See'];
                    this.rpiDriver.setupCamera(config);
                    break;
                }

                case Hardware.LED_NEOPIXEL:
                {
                    const config: TOML.AnyJson = this.config['Shine']['NeoPixel'];
                    this.rpiDriver.setupLEDNeopixel(config);
                    break;
                }

                case Hardware.LED_COMMON_ANODE:
                {
                    const config: TOML.AnyJson = this.config['Shine']['CommonAnode'];
                    this.rpiDriver.setupLEDCommonAnode(config);
                    break;
                }

                case Hardware.MICROPHONE:
                {
                    const config: TOML.AnyJson = this.config['Listen'];
                    this.rpiDriver.setupMicrophone(config);
                    break;
                }

                case Hardware.SERVO:
                {
                    const config: TOML.AnyJson = this.config['Wave'];
                    this.rpiDriver.setupServo(config);
                    break;
                }

                case Hardware.SPEAKER:
                {
                    const config: TOML.AnyJson = this.config['Speak'];
                    this.rpiDriver.setupSpeaker(config);
                    break;
                }
                default:
                    break;
            }
        }, this);
    }

    /**
    * Change the level of TJBot's logging.
    * @param {string} level Logging level (see Winston's [list of logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels))
    */
    setLogLevel(level: string) {
        winston.level = level;
    }

    /** ------------------------------------------------------------------------ */
    /**  WATSON SERVICE INITIALIZATION                                           */
    /** ------------------------------------------------------------------------ */

    /**
     * Instantiate the specified Watson service.
     * @private
     * @param {string} service The name of the service. Valid names are defined in TJBot.services.
     */
    _createServiceAPI(service: string) {
        winston.verbose(`🧠 initializing ${service} service`);

        switch (service) {
            case WatsonService.SPEECH_TO_TEXT: {
                // https://cloud.ibm.com/apidocs/speech-to-text
                this.stt = new SpeechToTextV1({});
                break;
            }

            case WatsonService.TEXT_TO_SPEECH: {
                // https://cloud.ibm.com/apidocs/text-to-speech
                this.tts = new TextToSpeechV1({});
                break;
            }

            default:
                break;
        }
    }

    /**
     * Assert that TJBot is able to perform a specified capability. Instantiates Watson
     * services as needed.
     * @private
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     */
    _assertCapability(capability: Capability) {
        switch (capability) {
            case Capability.LISTEN:
                if (!this.rpiDriver.hasCapability(Capability.LISTEN)) {
                    throw new Error(
                        'TJBot is not configured to listen. '
                        + 'Please check that you included the '
                        + `${Hardware.MICROPHONE} hardware in the TJBot initialize() method.`,
                    );
                }
                if (!this.stt) {
                    this._createServiceAPI(WatsonService.SPEECH_TO_TEXT);
                }
                break;

            case Capability.LOOK:
                if (!this.rpiDriver.hasCapability(Capability.LOOK)) {
                    throw new Error(
                        'TJBot is not configured to look. '
                        + 'Please check that you included the '
                        + `${Hardware.CAMERA} hardware in the TJBot initialize() method.`,
                    );
                }
                break;

            case Capability.SHINE:
                if (!this.rpiDriver.hasCapability(Capability.SHINE)) {
                    throw new Error(
                        'TJBot is not configured with an LED. '
                        + 'Please check that you included the '
                        + `${Hardware.LED_NEOPIXEL} or ${Hardware.LED_COMMON_ANODE} `
                        + 'hardware in the TJBot initialize() method.',
                    );
                }
                break;

            case Capability.SPEAK:
                if (!this.rpiDriver.hasCapability(Capability.SPEAK)) {
                    throw new Error(
                        'TJBot is not configured to speak. '
                        + 'Please check that you included the '
                        + `${Hardware.SPEAKER} hardware in the TJBot initialize() method.`,
                    );
                }
                if (!this.tts) {
                    this._createServiceAPI(WatsonService.TEXT_TO_SPEECH);
                }
                break;

            case Capability.WAVE:
                if (!this.rpiDriver.hasCapability(Capability.WAVE)) {
                    throw new Error(
                        'TJBot is not configured with an arm. '
                        + 'Please check that you included the '
                        + `${Hardware.SERVO} hardware in the TJBot initialize() method.`,
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
     * @param {number} sec Number of seconds to sleep for.
     */
    static sleep(sec: number) {
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
        this._assertCapability(Capability.LISTEN);

        // lazy create the sttTextStream
        if (this.sttTextStream === undefined) {
            // (re)-initialize the microphone because if stopListening() was called, we don't seem to
            // be able to re-use the microphone twice
            const config = this.config['Listen'];
            this.rpiDriver.setupMicrophone(config);

            // create the microphone -> STT recognizer stream
            // see this page for additional documentation on the STT configuration parameters:
            // https://cloud.ibm.com/apidocs/speech-to-text?code=node#recognize-audio-websockets-
            const rate = config['Listen'].microphoneRate ?? 44100;
            const channels = config['Listen'].microphoneChannels ?? 2;
            const inactivityTimeout = config['Listen'].inactivityTimeout ?? -1;
            const backgroundAudioSuppression = config['Listen'].backgroundAudioSuppression ?? 0.4;
            const model = config['Listen'].model ?? 'en-US_Multimedia';

            const params = {
                objectMode: false,
                contentType: `audio/l16; rate=${rate}; channels=${channels}`,
                model: model,
                inactivityTimeout: inactivityTimeout,
                interimResults: true,
                backgroundAudioSuppression: backgroundAudioSuppression,
            };

            winston.debug(`🎤 recognizeUsingWebSocket() params: ${JSON.stringify(params)}`);

            // Create the stream.
            this.recognizeStream = this.stt.recognizeUsingWebSocket(params);
            this.recognizeStream.setEncoding('utf8');

            // create the mic -> STT recognizer -> text stream
            this.sttTextStream = this.micInputStream.pipe(this.recognizeStream);
            this.sttTextStream.setEncoding('utf8');

            // start the microphone
            this.rpiDriver.mic.start();

            // handle errors
            this._sttTextStream.on('error', (err) => {
                winston.error('an error occurred in the STT text stream: ', err);
            });
        }

        const fd = this.sttTextStream;
        const end = new Promise((resolve) => {
            fd.once('data', resolve);
        });
        const transcript = await end;

        winston.verbose(`👂 TJBot heard: "${transcript.trim()}"`);
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
            winston.verbose('🎤 listening paused');
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
            winston.verbose('🎤 listening resumed');
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

        if (filePath === '') {
            filePath = temp.path({
                prefix: 'tjbot',
                suffix: '.jpg',
            });
        }

        winston.verbose(`📷 capturing image at path: ${filePath}`);

        // set the configuration options, which may have changed since the camera was initialized
        const cameraConfig = {
            output: filePath,
            nopreview: true,
            hflip: this.config.See.horizontalFlip,
            vflip: this.config.See.vertifalFlip,
            width: this.config.See.cameraResolution[0],
            height: this.config.See.cameraResolution[1],
        }

        winston.debug(`📷 camera options: ${JSON.stringify(cameraConfig)}`);

        try {
            await this._camera.jpeg({ config: cameraConfig });
            return filePath;
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
    shine(color, asPulse = false) {
        this._assertCapability(TJBot.Capability.SHINE);

        // normalize the color
        let c = this._normalizeColor(color);

        // remove leading '#' if present
        if (c.startsWith('#')) {
            c = c.substring(1);
        }

        // shine! will shine on both LEDs if they are both set up
        if (this._commonAnodeLed) {
            this._renderCommonAnodeLed(c);
        }

        if (this._neopixelLed) {
            this._renderNeopixelLed(c);
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
        let ease = [];
        for (let i = 0; i < numSteps; i += 1) {
            ease.push(i);
        }

        ease = ease.map((x, i) => easeInOutQuad(i, 0, 1, ease.length));

        // normalize to 'duration' sec
        ease = ease.map((x) => x * duration);

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
        winston.verbose(`💡 pulsing my LED to RGB color ${rgb}`);
        for (let i = 0; i < easeDelays.length; i += 1) {
            const c = i < colorRamp.length
                ? colorRamp[i]
                : colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
            this.shine(c, true);
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
    * @param {string} hexColor Color in hex format (e.g. "AA00FF", no leading "0x")
    * @private
    */
    _renderCommonAnodeLed(hexColor) {
        const rgb = this._convertHexToRgbColor(hexColor);
        this._commonAnodeLed.redPin.pwmWrite(rgb[0] == null ? 255 : 255 - rgb[0]);
        this._commonAnodeLed.greenPin.pwmWrite(rgb[1] == null ? 255 : 255 - rgb[1]);
        this._commonAnodeLed.bluePin.pwmWrite(rgb[2] == null ? 255 : 255 - rgb[2]);
    }

    /**
    * Render the given rgb color for the NeoPixel led.
    * @param {string} hexColor Color in hex format (e.g. "AA00FF", no leading "0x")
    * @private
    */
    _renderNeopixelLed(hexColor) {
        this._neopixelLed.render(hexColor);
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

        winston.verbose(`🔈 TJBot speaking with voice ${this.config.Speak.voice}`);

        const params = {
            text: message,
            voice: this.config.Speak.voice,
            accept: 'audio/wav',
        };

        const info = temp.openSync('tjbot');
        const response = await this._tts.synthesize(params);

        // pipe the audio buffer to a file
        winston.debug('🔈 writing audio buffer to temp file', info.path);
        const fd = fs.createWriteStream(info.path);
        response.result.pipe(fd);

        // wait for the pipe to finish writing
        const end = new Promise((resolve, reject) => {
            fd.on('close', resolve);
            fd.on('error', reject);
        });
        await end;

        // now play it
        winston.verbose(`🔈 TJBot speaking: ${message}`);
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
            player: 'aplay'
        };

        if (this.config.Speak.device) {
            winston.verbose('🔈 playing through user-defined audio device: ' + this.config.Speak.device);
            params.device = this.config.Speak.device;
        } else {
            winston.verbose('🔈 playing through default audio device');
        }

        const player = new this._soundplayer(params);

        winston.debug('🔈 playing audio with parameters: ', params);

        // capture 'this' context so we can reference it in the callback
        const self = this;
        player.on('complete', () => {
            winston.debug('🔈 audio playback finished');

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
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.armBack()
     */
    armBack() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston.verbose("🦾 Moving TJBot's arm back");
        this._motor.servoWrite(TJBot.Servo.ARM_BACK);
    }

    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston.verbose("🦾 Raising TJBot's arm");
        this._motor.servoWrite(TJBot.Servo.ARM_UP);
    }

    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston.verbose("🦾 Lowering TJBot's arm");
        this._motor.servoWrite(TJBot.Servo.ARM_DOWN);
    }

    /**
     * Waves TJBots's arm once.
     */
    async wave() {
        this._assertCapability(TJBot.Capability.WAVE);
        winston.verbose("🦾 Waving TJBot's arm");

        const delay = 200;

        this._motor.servoWrite(TJBot.Servo.ARM_UP);
        TJBot.sleep(delay);

        this._motor.servoWrite(TJBot.Servo.ARM_DOWN);
        TJBot.sleep(delay);

        this._motor.servoWrite(TJBot.Servo.ARM_UP);
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
