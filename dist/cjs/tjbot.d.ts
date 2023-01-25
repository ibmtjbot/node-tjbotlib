export default TJBot;
/**
* Class representing a TJBot
*/
declare class TJBot {
    /**
     * TJBot library version
     * @readonly
    */
    static readonly VERSION: "v2.0.2";
    /**
     * TJBot capabilities
     * @readonly
     * @enum {string}
     */
    static readonly CAPABILITIES: {
        ANALYZE_TONE: string;
        CONVERSE: string;
        LISTEN: string;
        SEE: string;
        SHINE: string;
        SPEAK: string;
        TRANSLATE: string;
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
        ASSISTANT: string;
        LANGUAGE_TRANSLATOR: string;
        SPEECH_TO_TEXT: string;
        TEXT_TO_SPEECH: string;
        NATURAL_LANGUAGE_UNDERSTANDING: string;
        VISUAL_RECOGNITION: string;
    };
    /**
     * TJBot languages for listening, speaking, and seeing
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
        SEE: {
            CHINESE: string;
            ENGLISH: string;
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
        converse: {
            assistantId: undefined;
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
        see: {
            confidenceThreshold: number;
            camera: {
                height: number;
                width: number;
                verticalFlip: boolean;
                horizontalFlip: boolean;
            };
            language: any;
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
    static sleep(msec: any): void;
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
        converse: {
            assistantId: undefined;
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
        see: {
            confidenceThreshold: number;
            camera: {
                height: number;
                width: number;
                verticalFlip: boolean;
                horizontalFlip: boolean;
            };
            language: any;
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
    initialize(hardware: any): Promise<void>;
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
    _assistant: AssistantV2 | undefined;
    _languageTranslator: LanguageTranslatorV3 | undefined;
    _stt: SpeechToTextV1 | undefined;
    _tts: TextToSpeechV1 | undefined;
    _toneAnalyzer: NaturalLanguageUnderstandingV1 | undefined;
    _visualRecognition: VisualRecognitionV3 | undefined;
    /**
     * Assert that TJBot is able to perform a specified capability. Instantiates Watson
     * services as needed.
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     * @private
     */
    private _assertCapability;
    /** ------------------------------------------------------------------------ */
    /** ANALYZE TONE                                                             */
    /** ------------------------------------------------------------------------ */
    /**
     * Analyze the tone of the given text.
     * @param {string} text The text to analyze.
     * @return {object} Returns the response object from the Natural Language Understanding service.
     * @example
     * response = {
     *      "usage": {
     *          text_units": 1,
     *          "text_characters": 37,
     *          "features": 1
     *      },
     *      "language": "en",
     *      "emotion": {
     *          "targets": [
     *              {
     *                  "text": "apples",
     *                      "emotion": {
     *                      "sadness": 0.028574,
     *                      "joy": 0.859042,
     *                      "fear": 0.02752,
     *                      "disgust": 0.017519,
     *                      "anger": 0.012855
     *                      }
     *              }
     *          ],
     *      "document": {
     *          "emotion": {
     *              "sadness": 0.32665,
     *              "joy": 0.563273,
     *              "fear": 0.033387,
     *              "disgust": 0.022637,
     *              "anger": 0.041796
     *          }
     *      }
     *  }

     * }
     * @see {@link https://cloud.ibm.com/apidocs/natural-language-understanding?code=node#emotion|Natural Language Understanding} documentation provides details on the response object.
     * @async
     */
    analyzeTone(text: string): object;
    /** ------------------------------------------------------------------------ */
    /** CONVERSE                                                                 */
    /** ------------------------------------------------------------------------ */
    /**
     * Take a conversational turn in the conversation.
     * @param  {string} message The message to send to the Assistant service.
     * @return {object} Returns an object with two keys: `object` contains the full Assistant response object, and `description` contains the string response.
     * @example
     * response = {
     *     "object": {conversation response object},
     *     "description": "hello, how are you"
     * }
     * @see {@link https://cloud.ibm.com/apidocs/assistant/assistant-v2?code=node#message|Assistant} documentation provides details on the response object.
     * @async
     */
    converse(message: string): object;
    _assistantSessionId: string | undefined;
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
    /** SEE                                                                      */
    /** ------------------------------------------------------------------------ */
    /**
     * Take a picture and identify the objects present.
     * @param  {array=} classifierIds (optional) List of classifier IDs to use in the Visual Recognition service.
     * @return {object} Returns a list of objects seen and their confidences.
     * @example
     * response = {
     *     "images": [{
     *         "classifiers": [{
     *             "classifier_id": "roundPlusBanana_1758279329",
     *             "name": "roundPlusBanana",
     *             "classes": [{
     *                     "class": "fruit",
     *                     "score": 0.788
     *                 },
     *                 {
     *                     "class": "olive color",
     *                     "score": 0.973
     *                 },
     *                 {
     *                     "class": "lemon yellow color",
     *                     "score": 0.789
     *                 }
     *             ]
     *         }],
     *         "image": "fruitbowl.jpg"
     *     }],
     *     "images_processed": 1,
     *     "custom_classes": 6
     * }
     * @see {@link https://cloud.ibm.com/apidocs/visual-recognition/visual-recognition-v3?code=node#classify|Visual Recognition}
     * documentation provides details on the response object. The response object returned by
     * `see()` corresponds to `response.images[0].classifiers[0].classes` from Visual Recognition.
     * @async
     */
    see(classifierIds?: any | undefined): object;
    /**
     * Recognize objects in a given photo.
     * @param  {string} filePath Path to the photo file.
     * @param  {array=} classifierIds (optional) List of classifier IDs to use in the Visual Recognition service.
     * @return {object} Returns a list of objects seen and their confidences.
     * @see {@link https://cloud.ibm.com/apidocs/visual-recognition/visual-recognition-v3?code=node#classify|Visual Recognition}
     * documentation provides details on the response object. The response object returned by
     * `see()` corresponds to `response.images[0].classifiers[0].classes` from Visual Recognition.
     * @async
     */
    recognizeObjectsInPhoto(filePath: string, classifierIds?: any | undefined): object;
    /**
     * Capture an image and save it in the given path.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @async
     */
    takePhoto(filePath?: string | undefined): string;
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
    pulse(color: string, duration?: any | undefined): Promise<void>;
    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     */
    shineColors(): any;
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
    /** TRANSLATE                                                                */
    /** ------------------------------------------------------------------------ */
    /**
     * Translates the given text from the source language to the target language.
     *
     * @param {string} text The text to translate.
     * @param {string} sourceLanguage The source language (e.g. "en" for English).
     * @param {string} targetLanguage The target language (e.g. "es" for Spanish).
     * @return {object} The response object from the Language Translator service.
     * @example
     * response = {
     *     "object": {
     *         "translations": [{
     *             "translation": "Hola, mi nombre es TJBot!"
     *         }],
     *         "word_count": 7,
     *         "character_count": 25
     *      },
     *     "description": "Hola, mi nombre es TJBot!"
     * }
     * @see Use {@link #TJBot+isTranslatable} to determine whether lanuage can be translated from
     * the `sourceLanguage` to `targetLanguage`.
     * @see {@link https://cloud.ibm.com/apidocs/language-translator?code=node#translate|Language Translator}
     * documentation provides details on the response object.
     * @async
     */
    translate(text: string, sourceLanguage: string, targetLanguage: string): object;
    /**
     * Identifies the language of the given text.
     * @param {string} text The text to identify.
     * @return {object} Returns a response object from the Language Translator service.
     * @example
     * response = {
     *     "languages": [{
     *             "language": "en",
     *             "confidence": 0.9804833843796723
     *         },
     *         {
     *             "language": "nn",
     *             "confidence": 0.005988721319786277
     *         },
     *         {
     *             "language": "sq",
     *             "confidence": 0.0036927759389060203
     *         },
     *         {
     *             "language": "nb",
     *             "confidence": 0.0035802051870239037
     *         }
     *     ]
     * }
     * @see {@link https://cloud.ibm.com/apidocs/language-translator?code=node#identify|Language Translator}
     * documentation provides details on the response object.
     * @async
     */
    identifyLanguage(text: string): object;
    /**
     * Determines if TJBot can translate from the source language to the target language.
     * @param {string} sourceLanguage The source language (e.g. "en" for English).
     * @param {string} targetLanguage The target language (e.g. "es" for Spanish).
     * @return {bool} True if the `sourceLanguage` can be translated to the
     * `targetLanguage`, false otherwise.
     * @async
     */
    isTranslatable(sourceLanguage: string, targetLanguage: string): any;
    _translationModels: {} | undefined;
    /**
     * Returns a list of languages that can TJBot can translate to from the given language.
     * @param {string} sourceLanguage The source language (e.g. "en" for English)
     * @return {array} List of languages that TJBot can translate to from the source langauge
     */
    translatableLanguages(sourceLanguage: string): any;
    /**
     * Returns the name of the given language code.
     * @param {string} languageCode Two-character language code (e.g. "en")
     * @return {string} Name of the language (e.g. "English"), or undefined if the language is unknown.
     */
    languageForCode(languageCode: string): string;
    /**
     * Returns the two-letter code for the given language.
     * @param {string} language Name of the language (e.g. "English")
     * @return {string} Two-letter language code for the language (e.g. "en"), or undefined if the language code is unknown.
     */
    codeForLanguage(language: string): string;
    /**
     * Loads the list of language models that can be used for translation.
     * @private
     * @async
     */
    private _loadLanguageTranslationModels;
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
import { Raspistill } from "node-raspistill";
import { Gpio } from "pigpio";
import AssistantV2 from "ibm-watson/assistant/v2.js";
import LanguageTranslatorV3 from "ibm-watson/language-translator/v3.js";
import SpeechToTextV1 from "ibm-watson/speech-to-text/v1.js";
import TextToSpeechV1 from "ibm-watson/text-to-speech/v1.js";
import NaturalLanguageUnderstandingV1 from "ibm-watson/natural-language-understanding/v1";
import VisualRecognitionV3 from "ibm-watson/visual-recognition/v3.js";
