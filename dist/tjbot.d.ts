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
import { Capability, Hardware } from './constants.js';
import { RPiHardwareDriver } from './rpi-driver.js';
import TOML, { JsonMap } from '@iarna/toml';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
import RecognizeStream from 'ibm-watson/lib/recognize-stream.js';
/**
* Class representing a TJBot
*/
declare class TJBot {
    /**
     * TJBot library version
     * @readonly
    */
    static VERSION: string;
    /**
     * Hardware list
     * @readonly
     */
    static Hardware: typeof Hardware;
    /**
     * TJBot configuration
     */
    config: JsonMap;
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
    stt: SpeechToTextV1 | undefined;
    sttRecognizeStream: RecognizeStream | undefined;
    sttTextStream: RecognizeStream | undefined;
    /**
     * Watson TTS service
     */
    tts: TextToSpeechV1 | undefined;
    /**
     * Cache of the colors recognized by TJBot
     */
    _shineColors: string[];
    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @constructor
     * @param  {string=} configFile      (optional) Configuration for the TJBot.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM AI services.
     */
    constructor(configFile?: string | undefined, credentialsFile?: string | undefined);
    /**
     * Helper method to load user-specific configuration from the user-facing TJBot configuration file.
     * @param  {string} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {JsonMap} The TOML configuration.
     */
    static loadUserConfig(configFile?: string | undefined): JsonMap;
    /**
     * Helper method to load recipe-specific configuration from the user-facing TJBot configuration file.
     * @param  {string} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {TOML.AnyJson} The TOML configuration specified in the [Recipe] section.
     */
    static loadRecipeConfig(configFile?: string | undefined): TOML.AnyJson;
    /**
     * Internal helper method to load TJBot's default TOML configuration from a specified file.
     * Do not use this method within TJBot recipes. Instead, use `TJBot.loadUserConfig()`.
     * @private
     * @param  {string} configFile   Path to the TOML file to load.
     * @return {JsonMap} The TOML configuration.
     */
    static _loadInternalConfigFromTOML(configFile?: string | undefined): JsonMap;
    /**
    * Load TJBot's configuration from TOML files.
    * @private
    * @param  {string} configFile   Path to the TOML file to load.
    */
    static _loadTJBotConfig(configFile: string): TOML.JsonMap;
    /**
     * @param  {array} hardware List of hardware peripherals attached to TJBot.
     * @see {@link #TJBot+Hardware} for a list of supported hardware.
     * @async
     */
    initialize(hardware: Hardware[]): Promise<void>;
    /**
    * Change the level of TJBot's logging.
    * @param {string} level Logging level (see Winston's [list of logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels))
    */
    setLogLevel(level: string): void;
    /** ------------------------------------------------------------------------ */
    /**  WATSON SERVICE INITIALIZATION                                           */
    /** ------------------------------------------------------------------------ */
    /**
     * Instantiate the specified Watson service.
     * @private
     * @param {string} service The name of the service. Valid names are defined in TJBot.services.
     */
    _createServiceAPI(service: string): void;
    /**
     * Assert that TJBot is able to perform a specified capability. Instantiates Watson
     * services as needed.
     * @private
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     */
    _assertCapability(capability: Capability): void;
    /** ------------------------------------------------------------------------ */
    /** LISTEN                                                                   */
    /** ------------------------------------------------------------------------ */
    /**
     * Listen for a spoken utterance.
     * @async
     */
    listen(): Promise<string>;
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
    look(filePath?: string): Promise<string>;
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
    shine(color: string): void;
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
    pulse(color: string, duration?: number): Promise<void>;
    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     */
    shineColors(): string[];
    /**
     * Get a random color.
     * @return {string} Random named color.
     */
    randomColor(): string;
    /** ------------------------------------------------------------------------ */
    /** SPEAK                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Speak a message.
     * @param {string} message The message to speak.
     * @async
     */
    speak(message: string): Promise<void>;
    /**
     * Play a sound at the specified path.
     * @param {string} soundFile The path to the sound file to be played.
     * @async
     */
    play(soundFile: string): Promise<void>;
    /** ------------------------------------------------------------------------ */
    /** WAVE                                                                     */
    /** ------------------------------------------------------------------------ */
    /**
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.armBack()
     */
    armBack(): void;
    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm(): void;
    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm(): void;
    /**
     * Waves TJBots's arm once.
     */
    wave(): Promise<void>;
}
/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */
/**
 * Export TJBot!
 */
export default TJBot;
