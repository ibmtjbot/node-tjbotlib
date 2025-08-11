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
import { Capability, Hardware, ServoPosition, WatsonService } from './constants.js';
import { normalizeColor, sleep } from './utils.js';
import RPiDetect from './rpi-detect';
import RPi3Driver from './rpi3-driver';
import RPi4Driver from './rpi4-driver';
import RPi5Driver from './rpi5-driver';
// node modules
import temp from 'temp';
import fs from 'fs';
import colorToHex from 'colornames';
import cm from 'color-model';
import winston from 'winston';
import TOML from '@iarna/toml';
import { easeInOutQuad } from 'js-easing-functions';
import { resolve } from 'import-meta-resolve';
// watson modules
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
/**
* Class representing a TJBot
*/
class TJBot {
    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @constructor
     * @param  {string=} configFile      (optional) Configuration for the TJBot.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM AI services.
     */
    constructor(configFile = 'tjbot.toml', credentialsFile = 'ibm-credentials.env') {
        /**
         * Cache of the colors recognized by TJBot
         */
        this._shineColors = [];
        this.config = TJBot._loadTJBotConfig(configFile);
        // set up logging
        winston.configure({
            level: this.config['Log']['level'] ?? 'info',
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
        }
        else if (this.rpiModel.startsWith('Raspberry Pi 4')) {
            this.rpiDriver = new RPi4Driver();
        }
        else if (this.rpiModel.startsWith('Raspberry Pi 5')) {
            this.rpiDriver = new RPi5Driver();
        }
        else {
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
     * @param  {string} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {JsonMap} The TOML configuration.
     */
    static loadUserConfig(configFile = 'tjbot.toml') {
        let config = {};
        try {
            const configData = fs.readFileSync(configFile, 'utf8');
            config = TOML.parse(configData);
        }
        catch (err) {
            throw new Error(`unable to read TOML from ${configFile}: ${err}`);
        }
        return config;
    }
    /**
     * Helper method to load recipe-specific configuration from the user-facing TJBot configuration file.
     * @param  {string} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {TOML.AnyJson} The TOML configuration specified in the [Recipe] section.
     */
    static loadRecipeConfig(configFile = 'tjbot.toml') {
        return TJBot.loadUserConfig(configFile).Recipe;
    }
    /**
     * Internal helper method to load TJBot's default TOML configuration from a specified file.
     * Do not use this method within TJBot recipes. Instead, use `TJBot.loadUserConfig()`.
     * @private
     * @param  {string} configFile   Path to the TOML file to load.
     * @return {JsonMap} The TOML configuration.
     */
    static _loadInternalConfigFromTOML(configFile = './tjbot.default.toml') {
        // const configPath: string = import.meta.resolve(configFile);
        const configPath = resolve(configFile, import.meta.url);
        winston.info(`loading default TJBot configuraution TOML from ${configPath}`);
        let config = {};
        try {
            const configData = fs.readFileSync(new URL(configPath), 'utf8');
            config = TOML.parse(configData);
        }
        catch (err) {
            throw new Error(`unable to read TOML from ${configFile}: ${err}`);
        }
        return config;
    }
    /**
    * Load TJBot's configuration from TOML files.
    * @private
    * @param  {string} configFile   Path to the TOML file to load.
    */
    static _loadTJBotConfig(configFile) {
        // load base config
        const baseConfig = TJBot._loadInternalConfigFromTOML();
        let userConfig = {};
        try {
            if (fs.existsSync(configFile) && fs.lstatSync(configFile).isFile()) {
                userConfig = TJBot.loadUserConfig(configFile);
            }
        }
        catch (err) {
            throw new Error(`unable to read tjbot configuration from ${configFile}: ${err}`);
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
        winston.info(`🤖 Initializing TJBot with ${hardware.join(', ')}`);
        hardware.forEach((device) => {
            switch (device) {
                case Hardware.CAMERA:
                    {
                        const config = this.config['See'];
                        this.rpiDriver.setupCamera(config);
                        break;
                    }
                case Hardware.LED_NEOPIXEL:
                    {
                        const config = this.config['Shine']['NeoPixel'];
                        this.rpiDriver.setupLEDNeopixel(config);
                        break;
                    }
                case Hardware.LED_COMMON_ANODE:
                    {
                        const config = this.config['Shine']['CommonAnode'];
                        this.rpiDriver.setupLEDCommonAnode(config);
                        break;
                    }
                case Hardware.MICROPHONE:
                    {
                        const config = this.config['Listen'];
                        this.rpiDriver.setupMicrophone(config);
                        break;
                    }
                case Hardware.SERVO:
                    {
                        const config = this.config['Wave'];
                        this.rpiDriver.setupServo(config);
                        break;
                    }
                case Hardware.SPEAKER:
                    {
                        const config = this.config['Speak'];
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
    setLogLevel(level) {
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
    _createServiceAPI(service) {
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
    _assertCapability(capability) {
        switch (capability) {
            case Capability.LISTEN:
                if (!this.rpiDriver.hasCapability(Capability.LISTEN)) {
                    throw new Error('TJBot is not configured to listen. '
                        + 'Please check that you included the '
                        + `${Hardware.MICROPHONE} hardware in the TJBot initialize() method.`);
                }
                if (!this.stt) {
                    this._createServiceAPI(WatsonService.SPEECH_TO_TEXT);
                }
                break;
            case Capability.LOOK:
                if (!this.rpiDriver.hasCapability(Capability.LOOK)) {
                    throw new Error('TJBot is not configured to look. '
                        + 'Please check that you included the '
                        + `${Hardware.CAMERA} hardware in the TJBot initialize() method.`);
                }
                break;
            case Capability.SHINE:
                if (!this.rpiDriver.hasCapability(Capability.SHINE)) {
                    throw new Error('TJBot is not configured with an LED. '
                        + 'Please check that you included the '
                        + `${Hardware.LED_NEOPIXEL} or ${Hardware.LED_COMMON_ANODE} `
                        + 'hardware in the TJBot initialize() method.');
                }
                break;
            case Capability.SPEAK:
                if (!this.rpiDriver.hasCapability(Capability.SPEAK)) {
                    throw new Error('TJBot is not configured to speak. '
                        + 'Please check that you included the '
                        + `${Hardware.SPEAKER} hardware in the TJBot initialize() method.`);
                }
                if (!this.tts) {
                    this._createServiceAPI(WatsonService.TEXT_TO_SPEECH);
                }
                break;
            case Capability.WAVE:
                if (!this.rpiDriver.hasCapability(Capability.WAVE)) {
                    throw new Error('TJBot is not configured with an arm. '
                        + 'Please check that you included the '
                        + `${Hardware.SERVO} hardware in the TJBot initialize() method.`);
                }
                break;
            default:
                break;
        }
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
            const rate = config.microphoneRate ?? 44100;
            const channels = config.microphoneChannels ?? 2;
            const inactivityTimeout = config.inactivityTimeout ?? -1;
            const backgroundAudioSuppression = config.backgroundAudioSuppression ?? 0.4;
            const model = config.model ?? 'en-US_Multimedia';
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
            this.sttRecognizeStream = this.stt?.recognizeUsingWebSocket(params);
            this.sttRecognizeStream?.setEncoding('utf8');
            // create the mic -> STT recognizer -> text stream
            this.sttTextStream = this.rpiDriver.connectMicStreamToSTTStream(this.sttRecognizeStream);
            this.sttTextStream.setEncoding('utf8');
            // start the microphone
            this.rpiDriver.startMic();
            // handle errors
            this.sttTextStream.on('error', (err) => {
                winston.error('an error occurred in the STT text stream: ', err);
            });
        }
        const fd = this.sttTextStream;
        const end = new Promise((resolve) => {
            fd.once('data', (data) => resolve(data));
        });
        const transcript = await end;
        winston.verbose(`👂 TJBot heard: "${transcript.trim()}"`);
        return transcript.trim();
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
    async look(filePath) {
        this._assertCapability(Capability.LOOK);
        const path = await this.rpiDriver.capturePhoto(filePath);
        return path;
    }
    /** ------------------------------------------------------------------------ */
    /** SHINE                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Change the color of the LED.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     */
    shine(color) {
        this._assertCapability(Capability.SHINE);
        // normalize the color
        let c = normalizeColor(color);
        // remove leading '#' if present
        if (c.startsWith('#')) {
            c = c.substring(1);
        }
        // shine!
        this.rpiDriver.renderLED(c);
    }
    /**
     * Pulse the LED a single time.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @param {float=} duration The duration the pulse should last. The duration should be in
     * the range [0.5, 2.0] seconds.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     * @async
     */
    async pulse(color, duration = 1.0) {
        this._assertCapability(Capability.SHINE);
        if (duration < 0.5) {
            winston.warn('TJBot cannot pulse for less than 0.5 seconds, using duration of 0.5 seconds');
            duration = 0.5;
        }
        if (duration > 2.0) {
            throw new Error('TJBot cannot pulse for more than 2 seconds, using duration of 2.0 seconds');
            duration = 2.0;
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
        const rgb = normalizeColor(color).slice(1); // remove the #
        const hex = new cm.HexRgb(rgb);
        const colorRamp = [];
        for (let i = 0; i < numSteps / 2; i += 1) {
            const l = 0.0 + (i / (numSteps / 2)) * 0.5;
            colorRamp[i] = hex.toHsl()
                .lightness(l)
                .toRgb()
                .toHexString()
                .replace('#', '0x');
        }
        // perform the ease
        winston.verbose(`💡 pulsing my LED to RGB color ${rgb}`);
        for (let i = 0; i < easeDelays.length; i += 1) {
            const c = i < colorRamp.length
                ? colorRamp[i]
                : colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
            this.shine(c);
            sleep(easeDelays[i]);
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
    /** ------------------------------------------------------------------------ */
    /** SPEAK                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Speak a message.
     * @param {string} message The message to speak.
     * @async
     */
    async speak(message) {
        this._assertCapability(Capability.SPEAK);
        // make sure we're trying to say something
        if (message === undefined || message === '') {
            winston.error('TJBot tried to speak an empty message.');
            return; // exit if there's nothing to say!
        }
        const config = this.config['Speak'];
        const voice = config['voice'];
        winston.verbose(`🔈 TJBot speaking with voice ${voice}`);
        const params = {
            text: message,
            voice: voice,
            accept: 'audio/wav',
        };
        const info = temp.openSync('tjbot');
        const response = await this.tts?.synthesize(params);
        // pipe the audio buffer to a file
        winston.debug('🔈 writing audio buffer to temp file', info.path);
        const fd = fs.createWriteStream(info.path);
        response?.result.pipe(fd);
        // wait for the pipe to finish writing
        const end = new Promise((resolve, reject) => {
            fd.on('close', () => resolve());
            fd.on('error', () => reject());
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
        await this.rpiDriver.playAudio(soundFile);
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
        this._assertCapability(Capability.WAVE);
        winston.verbose("🦾 Moving TJBot's arm back");
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_BACK);
    }
    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm() {
        // make sure we have an arm
        this._assertCapability(Capability.WAVE);
        winston.verbose("🦾 Raising TJBot's arm");
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
    }
    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm() {
        // make sure we have an arm
        this._assertCapability(Capability.WAVE);
        winston.verbose("🦾 Lowering TJBot's arm");
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_DOWN);
    }
    /**
     * Waves TJBots's arm once.
     */
    async wave() {
        this._assertCapability(Capability.WAVE);
        winston.verbose("🦾 Waving TJBot's arm");
        const delay = 200;
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
        sleep(delay);
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_DOWN);
        sleep(delay);
        this.rpiDriver.renderServoPosition(ServoPosition.ARM_UP);
        sleep(delay);
    }
}
/**
 * TJBot library version
 * @readonly
*/
TJBot.VERSION = 'v3.0.0';
/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */
/**
 * Export TJBot!
 */
export default TJBot;
//# sourceMappingURL=tjbot.js.map