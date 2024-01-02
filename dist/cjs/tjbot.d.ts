export default TJBot;
/**
* Class representing a TJBot
*/
declare class TJBot {
    /**
     * TJBot library version
     * @readonly
    */
    static readonly VERSION: "v3.0.0";
    /**
     * TJBot capabilities
     * @readonly
     * @enum {string}
     */
    static readonly CAPABILITIES: {
        LISTEN: string;
        LOOK: string;
        SHINE: string;
        SPEAK: string;
        WAVE: string;
    };
    /**
     * TJBot hardware
     * @readonly
     * @enum {string}
     */
    static readonly HARDWARE: {
        CAMERA: string;
        LED_NEOPIXEL: string;
        LED_COMMON_ANODE: string;
        MICROPHONE: string;
        SERVO: string;
        SPEAKER: string;
    };
    /**
     * TJBot Watson services
     * @readonly
     * @enum {string}
     */
    static readonly SERVICES: {
        SPEECH_TO_TEXT: string;
        TEXT_TO_SPEECH: string;
    };
    /**
     * TJBot languages for listening and speaking
     * @readonly
     * @enum {string}
     */
    static readonly LANGUAGES: {
        LISTEN: {
            ARABIC: string;
            CHINESE: string;
            ENGLISH_UK: string;
            ENGLISH_US: string;
            FRENCH: string;
            GERMAN: string;
            ITALIAN: string;
            JAPANESE: string;
            KOREAN: string;
            PORTUGUESE: string;
            SPANISH: string;
        };
        SPEAK: {
            ARABIC: string;
            CHINESE: string;
            DUTCH: string;
            ENGLISH_GB: string;
            ENGLISH_US: string;
            FRENCH: string;
            GERMAN: string;
            ITALIAN: string;
            JAPANESE: string;
            KOREAN: string;
            PORTUGUESE: string;
            SPANISH: string;
        };
    };
    /**
     * TJBot genders, used to pick a voice when speaking
     * @readonly
     * @enum {string}
     */
    static readonly GENDERS: {
        MALE: string;
        FEMALE: string;
    };
    /**
     * TJBot servo motor stop positions
     * @readonly
     * @enum {int}
     */
    static readonly SERVO: {
        ARM_BACK: number;
        ARM_UP: number;
        ARM_DOWN: number;
    };
    /**
     * TJBot default configuration
     * @readonly
     */
    static readonly DEFAULT_CONFIG: {
        log: {
            level: string;
        };
        robot: {
            gender: string;
        };
        listen: {
            microphoneDeviceId: string;
            inactivityTimeout: number;
            backgroundAudioSuppression: number;
            language: string;
        };
        wave: {
            servoPin: number;
        };
        speak: {
            language: string;
            voice: undefined;
            speakerDeviceId: string;
        };
        look: {
            camera: {
                height: number;
                width: number;
                verticalFlip: boolean;
                horizontalFlip: boolean;
            };
        };
        shine: {
            neopixel: {
                gpioPin: number;
                grbFormat: boolean;
            };
            commonAnode: {
                redPin: number;
                greenPin: number;
                bluePin: number;
            };
        };
    };
    /** ------------------------------------------------------------------------ */
    /** UTILITY METHODS                                                          */
    /** ------------------------------------------------------------------------ */
    /**
     * Put TJBot to sleep.
     * @param {int} msec Number of milliseconds to sleep for (1000 msec == 1 sec).
     */
    static sleep(msec: int): void;
    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @param  {object} configuration   Configuration for the TJBot. See TJBot.DEFAULT_CONFIG for all configuration options.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM Watson services.
     * @return {TJBot} instance of the TJBot class
     */
    constructor(configuration?: object, credentialsFile?: string | undefined);
    configuration: {
        log: {
            level: string;
        };
        robot: {
            gender: string;
        };
        listen: {
            microphoneDeviceId: string;
            inactivityTimeout: number;
            backgroundAudioSuppression: number;
            language: string;
        };
        wave: {
            servoPin: number;
        };
        speak: {
            language: string;
            voice: undefined;
            speakerDeviceId: string;
        };
        look: {
            camera: {
                height: number;
                width: number;
                verticalFlip: boolean;
                horizontalFlip: boolean;
            };
        };
        shine: {
            neopixel: {
                gpioPin: number;
                grbFormat: boolean;
            };
            commonAnode: {
                redPin: number;
                greenPin: number;
                bluePin: number;
            };
        };
    };
    /**
     * @param  {array} hardware List of hardware peripherals attached to TJBot.
     * @see {@link #TJBot+HARDWARE} for a list of supported hardware.
     * @async
     */
    initialize(hardware: array): Promise<void>;
    /** ------------------------------------------------------------------------ */
    /** INTERNAL HARDWARE & WATSON SERVICE INITIALIZATION                        */
    /** ------------------------------------------------------------------------ */
    /**
    * Configure the camera hardware.
    * @private
    */
    private _setupCamera;
    _camera: Raspistill | undefined;
    /**
    * Configure the Neopixel LED hardware.
    * @param {int} gpioPin The GPIO pin number to which the LED is connected.
    * @private
    */
    private _setupLEDNeopixel;
    _neopixelLed: any;
    /**
    * Configure the common anode RGB LED hardware.
    * @param {int} redPin The pin number to which the led red pin is connected.
    * @param {int} greenPin The pin number to which the led green pin is connected.
    * @param {int} bluePin The pin number to which the led blue pin is connected.
    * @private
    */
    private _setupLEDCommonAnode;
    _commonAnodeLed: {
        redPin: Gpio;
        greenPin: Gpio;
        bluePin: Gpio;
    } | undefined;
    /**
     * Configure the microphone for speech recognition.
     * @private
     */
    private _setupMicrophone;
    _mic: any;
    _micInputStream: any;
    /**
     * Configure the servo module for the given pin number.
     * @param  {int} pin The pin number to which the servo is connected.
     * @private
     */
    private _setupServo;
    _motor: Gpio | undefined;
    /**
     * Configure the speaker.
     * @private
     */
    private _setupSpeaker;
    _soundplayer: any;
    /**
     * Instantiate the specified Watson service.
     * @param {string} service The name of the service. Valid names are defined in TJBot.services.
     * @param {string} version The version of the service (e.g. "2018-09-20"). If null, the default version will be used.
     * @private
     */
    private _createServiceAPI;
    _stt: SpeechToTextV1 | undefined;
    _tts: TextToSpeechV1 | undefined;
    /**
     * Assert that TJBot is able to perform a specified capability. Instantiates Watson
     * services as needed.
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     * @private
     */
    private _assertCapability;
    /** ------------------------------------------------------------------------ */
    /** LISTEN                                                                   */
    /** ------------------------------------------------------------------------ */
    /**
     * Listen for a spoken utterance.
     * @async
     */
    listen(): Promise<any>;
    _recognizeStream: import("ibm-watson/lib/recognize-stream") | undefined;
    _sttTextStream: any;
    /**
     * Internal method for pausing listening, used when
     * we want to play a sound but we don't want to assert
     * the 'listen' capability.
     * @private
     */
    private _pauseListening;
    /**
     * Internal method for resuming listening, used when
     * we want to play a sound but we don't want to assert
     * the 'listen' capability.
     * @private
     */
    private _resumeListening;
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
    look(filePath?: string | undefined): string;
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
    private _takePhoto;
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
    shine(color: string): void;
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
    pulse(color: string, duration?: float | undefined): Promise<void>;
    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     */
    shineColors(): array;
    /**
     * Get a random color.
     * @return {string} Random named color.
     */
    randomColor(): string;
    /**
     * Normalize the given color to #RRGGBB.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @return {string} Hex string corresponding to the given color (e.g. "#RRGGBB")
     * @private
     */
    private _normalizeColor;
    /**
    * Convert hex color code to RGB value.
    * @param {string} hexColor Hex color code
    * @return {array} RGB color (e.g. (255, 128, 128))
    * @private
    */
    private _convertHexToRgbColor;
    /**
    * Render the given rgb color for the common anode led.
    * @param {string} hexColor Color in hex format
    * @private
    */
    private _renderCommonAnodeLed;
    /** ------------------------------------------------------------------------ */
    /** SPEAK                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Speak a message.
     * @param {string} message The message to speak.
     * @async
     */
    speak(message: string): Promise<void>;
    _ttsVoices: import("ibm-watson/text-to-speech/v1-generated").Voice[] | undefined;
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
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.armBack()
     */
    armBack(): void;
    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm(): void;
    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm(): void;
    /**
     * Waves TJBots's arm once.
     */
    wave(): Promise<void>;
}
import { Raspistill } from 'node-raspistill';
import { Gpio } from 'pigpio';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
