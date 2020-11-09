/* eslint-disable import/extensions */
/**
 * Copyright 2016-2020 IBM Corp. All Rights Reserved.
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
import sleep from 'sleep';
import colorToHex from 'colornames';
import cm from 'color-model';
import winston from 'winston';
import { once } from 'events';

// hardware modules
import Mic from 'mic';
import { Raspistill } from 'node-raspistill';
import ws281x from 'rpi-ws281x-native';
import { Gpio } from 'pigpio';
import SoundPlayer from 'sound-player';

// watson modules
import AssistantV2 from 'ibm-watson/assistant/v2.js';
import LanguageTranslatorV3 from 'ibm-watson/language-translator/v3.js';
import SpeechToTextV1 from 'ibm-watson/speech-to-text/v1.js';
import TextToSpeechV1 from 'ibm-watson/text-to-speech/v1.js';
import ToneAnalyzerV3 from 'ibm-watson/tone-analyzer/v3.js';
import VisualRecognitionV3 from 'ibm-watson/visual-recognition/v3.js';

/**
* Class representing a TJBot
*/
class TJBot {
    /**
     * TJBot library version
     * @readonly
    */
    static VERSION = 'v2.0.0';

    /**
     * TJBot capabilities
     * @readonly
     * @enum {string}
     */
    static CAPABILITIES = {
        ANALYZE_TONE: 'analyze_tone',
        CONVERSE: 'converse',
        LISTEN: 'listen',
        SEE: 'see',
        SHINE: 'shine',
        SPEAK: 'speak',
        TRANSLATE: 'translate',
        WAVE: 'wave',
    };

    /**
     * TJBot hardware
     * @readonly
     * @enum {string}
     */
    static HARDWARE = {
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
    static SERVICES = {
        ASSISTANT: 'assistant',
        LANGUAGE_TRANSLATOR: 'language_translator',
        SPEECH_TO_TEXT: 'speech_to_text',
        TEXT_TO_SPEECH: 'text_to_speech',
        TONE_ANALYZER: 'tone_analyzer',
        VISUAL_RECOGNITION: 'visual_recognition',
    };

    /**
     * TJBot languages for listening, speaking, and seeing
     * @readonly
     * @enum {string}
     */
    static LANGUAGES = {
        // https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-models#models
        LISTEN: {
            ARABIC: 'ar-AR',
            CHINESE: 'zh-CN',
            ENGLISH_UK: 'en-GB',
            ENGLISH_US: 'en-US',
            FRENCH: 'fr-FR',
            GERMAN: 'de-DE',
            ITALIAN: 'it-IT',
            JAPANESE: 'ja-JP',
            KOREAN: 'ko-KR',
            PORTUGUESE: 'pt-BR',
            SPANISH: 'es-ES',
        },
        // https://cloud.ibm.com/docs/text-to-speech?topic=text-to-speech-voices
        SPEAK: {
            ARABIC: 'ar-AR',
            CHINESE: 'zh-CN',
            DUTCH: 'nl-NL',
            ENGLISH_GB: 'en-GB',
            ENGLISH_US: 'en-US',
            FRENCH: 'fr-FR',
            GERMAN: 'de-DE',
            ITALIAN: 'it-IT',
            JAPANESE: 'ja-JP',
            KOREAN: 'ko-KR',
            PORTUGUESE: 'pt-BR',
            SPANISH: 'es-ES',
        },
        // https://cloud.ibm.com/docs/visual-recognition?topic=visual-recognition-language-support-top
        SEE: {
            CHINESE: 'zh-cn',
            ENGLISH: 'en',
            FRENCH: 'fr',
            GERMAN: 'de',
            ITALIAN: 'it',
            JAPANESE: 'ja',
            KOREAN: 'ko',
            PORTUGUESE: 'pt-br',
            SPANISH: 'es',
        },
    };

    /**
     * TJBot genders, used to pick a voice when speaking
     * @readonly
     * @enum {string}
     */
    static GENDERS = {
        MALE: 'male',
        FEMALE: 'female',
    };

    /**
     * TJBot servo motor stop positions
     * @readonly
     * @enum {int}
     */
    static SERVO = {
        ARM_BACK: 500,
        ARM_UP: 1400,
        ARM_DOWN: 2300,
    };

    /**
     * TJBot default configuration
     * @readonly
     */
    static DEFAULT_CONFIG = {
        log: {
            level: 'info', // valid levels are 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
        },
        robot: {
            gender: TJBot.GENDERS.MALE, // see TJBot.GENDERS
        },
        converse: {
            assistantId: undefined, // placeholder for Watson Assistant's assistantId
        },
        listen: {
            microphoneDeviceId: 'plughw:1,0', // plugged-in USB card 1, device 0; see 'arecord -l' for a list of recording devices
            inactivityTimeout: -1, // -1 to never timeout or break the connection. Set this to a value in seconds e.g 120 to end connection after 120 seconds of silence
            backgroundAudioSuppression: 0.4, // should be in the range [0.0, 1.0] indicating how much audio suppression to perform
            language: TJBot.LANGUAGES.LISTEN.ENGLISH_US, // see TJBot.LANGUAGES.LISTEN
        },
        wave: {
            servoPin: 7, // default pin is GPIO 7 (physical pin 26)
        },
        speak: {
            language: TJBot.LANGUAGES.SPEAK.ENGLISH_US, // see TJBot.LANGUAGES.SPEAK
            voice: undefined, // use a specific voice; if undefined, a voice is chosen based on robot.gender and speak.language
            speakerDeviceId: 'plughw:0,0', // plugged-in USB card 1, device 0; 'see aplay -l' for a list of playback devices
        },
        see: {
            confidenceThreshold: 0.6,
            camera: {
                height: 720,
                width: 960,
                verticalFlip: false, // flips the image vertically, may need to set to 'true' if the camera is installed upside-down
                horizontalFlip: false, // flips the image horizontally, should not need to be overridden
            },
            language: TJBot.LANGUAGES.SEE.ENGLISH_US,
        },
        shine: {
            // see https://pinout.xyz for a pin diagram
            neopixel: {
                gpioPin: 18, // default pin is GPIO 18 (physical pin 12)
                grbFormat: false, // if false, the RGB color format will be used for the LED; if true, the GRB format will be used
            },
            commonAnode: {
                redPin: 19, // default red pin is GPIO 19 (physical pin 35)
                greenPin: 13, // default green pin is GPIO 13 (physical pin 33)
                bluePin: 12, // default blue pin is GPIO 12 (physical pin 32)
            },
        },
    };

    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @param  {object} configuration   Configuration for the TJBot. See TJBot.DEFAULT_CONFIG for all configuration options.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM Watson services.
     * @return {TJBot} instance of the TJBot class
     */
    constructor(configuration = {}, credentialsFile = '') {
        // import configuration params
        this.configuration = { ...TJBot.DEFAULT_CONFIG, ...configuration };

        // set up logging
        winston.configure({
            level: this.configuration.log.level || 'info',
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
        winston.silly(`TJBot configuration: ${JSON.stringify(this.configuration)}`);
    }

    /**
     * @param  {array} hardware List of hardware peripherals attached to TJBot.
     * @see {@link #TJBot+HARDWARE} for a list of supported hardware.
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
            case TJBot.HARDWARE.CAMERA:
                this._setupCamera();
                break;

            case TJBot.HARDWARE.LED_NEOPIXEL:
                this._setupLEDNeopixel(this.configuration.shine.neopixel.gpioPin);
                break;

            case TJBot.HARDWARE.LED_COMMON_ANODE:
                this._setupLEDCommonAnode(
                    this.configuration.shine.commonAnode.redPin,
                    this.configuration.shine.commonAnode.greenPin,
                    this.configuration.shine.commonAnode.bluePin,
                );
                break;

            case TJBot.HARDWARE.MICROPHONE:
                this._setupMicrophone();
                break;

            case TJBot.HARDWARE.SERVO:
                this._setupServo(this.configuration.wave.servoPin);
                break;

            case TJBot.HARDWARE.SPEAKER:
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
        winston.verbose(`initializing ${TJBot.HARDWARE.CAMERA}`);

        this._camera = new Raspistill({
            width: this.configuration.see.camera.width,
            height: this.configuration.see.camera.height,
            noPreview: true,
            encoding: 'jpg',
            outputDir: './',
            verticalFlip: this.configuration.see.camera.verticalFlip,
            horizontalFlip: this.configuration.see.camera.horizontalFlip,
            time: 1,
        });
    }

    /**
    * Configure the Neopixel LED hardware.
    * @param {int} gpioPin The GPIO pin number to which the LED is connected.
    * @private
    */
    _setupLEDNeopixel(gpioPin) {
        winston.verbose(`initializing ${TJBot.HARDWARE.LED_NEOPIXEL} on PIN ${gpioPin}`);

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
        winston.verbose(`initializing ${TJBot.HARDWARE.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);

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
        winston.verbose(`initializing ${TJBot.HARDWARE.MICROPHONE}`);

        const micParams = {
            rate: '16000',
            channels: '1',
            debug: false,
            exitOnSilence: 6,
        };

        if (this.configuration.listen.microphoneDeviceId) {
            micParams.device = this.configuration.listen.microphoneDeviceId;
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
        winston.verbose(`initializing ${TJBot.HARDWARE.SERVO} on PIN ${pin}`);

        this._motor = new Gpio(pin, {
            mode: Gpio.OUTPUT,
        });
    }

    /**
     * Configure the speaker.
     * @private
     */
    _setupSpeaker() {
        winston.verbose(`initializing ${TJBot.HARDWARE.SPEAKER}`);
        this._soundplayer = SoundPlayer;
    }

    /**
     * Instantiate the specified Watson service.
     * @param {string} service The name of the service. Valid names are defined in TJBot.services.
     * @param {string} version The version of the service (e.g. "2018-09-20"). If null, the default version will be used.
     * @private
     */
    _createServiceAPI(service, version) {
        winston.verbose(`initializing ${service} service`);

        switch (service) {
        case TJBot.SERVICES.ASSISTANT: {
            // https://cloud.ibm.com/apidocs/assistant-v2
            const defaultVersion = '2018-09-19';

            // there seems to be a bug in the AssistantV2 service where
            // the service name is 'conversation', so it expects the environment
            // variables for the credentails to be named CONVERSATION_*, but
            // when downloading the credentials files, they are named
            // ASSISTANT_*
            // AssistantV2.DEFAULT_SERVICE_NAME = 'assistant';

            this._assistant = new AssistantV2({
                serviceName: 'assistant',
                version: version || defaultVersion,
            });
            break;
        }

        case TJBot.SERVICES.LANGUAGE_TRANSLATOR: {
            // https://cloud.ibm.com/apidocs/language-translator
            const defaultVersion = '2018-05-01';

            this._languageTranslator = new LanguageTranslatorV3({
                version: version || defaultVersion,
            });
            break;
        }

        case TJBot.SERVICES.SPEECH_TO_TEXT: {
            // https://cloud.ibm.com/apidocs/speech-to-text
            this._stt = new SpeechToTextV1({});
            break;
        }

        case TJBot.SERVICES.TEXT_TO_SPEECH: {
            // https://cloud.ibm.com/apidocs/text-to-speech
            this._tts = new TextToSpeechV1({});
            break;
        }

        case TJBot.SERVICES.TONE_ANALYZER: {
            // https://cloud.ibm.com/apidocs/tone-analyzer
            const defaultVersion = '2017-09-21';

            this._toneAnalyzer = new ToneAnalyzerV3({
                version: version || defaultVersion,
            });
            break;
        }

        case TJBot.SERVICES.VISUAL_RECOGNITION: {
            // https://cloud.ibm.com/apidocs/visual-recognition/visual-recognition-v3
            const defaultVersion = '2018-03-19';

            this._visualRecognition = new VisualRecognitionV3({
                serviceName: 'visual_recognition',
                version: version || defaultVersion,
            });
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
        case TJBot.CAPABILITIES.ANALYZE_TONE:
            if (!this._toneAnalyzer) {
                this._createServiceAPI(TJBot.SERVICES.TONE_ANALYZER);
            }
            break;

        case TJBot.CAPABILITIES.CONVERSE:
            if (!this.configuration.converse.assistantId) {
                throw new Error(
                    'TJBot is not configured to converse. '
                        + 'Please check that you defined an assistantId for the '
                        + 'converse.assistantId parameter in the TJBot initialize() method.',
                );
            }
            if (!this._assistant) {
                this._createServiceAPI(TJBot.SERVICES.ASSISTANT);
            }
            break;

        case TJBot.CAPABILITIES.LISTEN:
            if (!this._mic) {
                throw new Error(
                    'TJBot is not configured to listen. '
                        + 'Please check that you included the '
                        + `${TJBot.HARDWARE.MICROPHONE} hardware in the TJBot initialize() method.`,
                );
            }
            if (!this._stt) {
                this._createServiceAPI(TJBot.SERVICES.SPEECH_TO_TEXT);
            }
            break;

        case TJBot.CAPABILITIES.SEE:
            if (!this._camera) {
                throw new Error(
                    'TJBot is not configured to see. '
                        + 'Please check that you included the '
                        + `${TJBot.HARDWARE.CAMERA} hardware in the TJBot initialize() method.`,
                );
            }
            if (!this._visualRecognition) {
                this._createServiceAPI(TJBot.SERVICES.VISUAL_RECOGNITION);
            }
            break;

        case TJBot.CAPABILITIES.SHINE:
            // one LED should be defined
            if (!this._neopixelLed && !this._commonAnodeLed) {
                throw new Error(
                    'TJBot is not configured with an LED. '
                        + 'Please check that you included the '
                        + `${TJBot.HARDWARE.LED_NEOPIXEL} or ${TJBot.HARDWARE.LED_COMMON_ANODE} `
                        + 'hardware in the TJBot initialize() method.',
                );
            }
            break;

        case TJBot.CAPABILITIES.SPEAK:
            if (!this._soundplayer) {
                throw new Error(
                    'TJBot is not configured to speak. '
                        + 'Please check that you included the '
                        + `${TJBot.HARDWARE.SPEAKER} hardware in the TJBot initialize() method.`,
                );
            }
            if (!this._tts) {
                this._createServiceAPI(TJBot.SERVICES.TEXT_TO_SPEECH);
            }
            break;

        case TJBot.CAPABILITIES.TRANSLATE:
            if (!this._languageTranslator) {
                this._createServiceAPI(TJBot.SERVICES.LANGUAGE_TRANSLATOR);
            }
            break;

        case TJBot.CAPABILITIES.WAVE:
            if (!this._motor) {
                throw new Error(
                    'TJBot is not configured with an arm. '
                        + 'Please check that you included the '
                        + `${TJBot.HARDWARE.SERVO} hardware in the TJBot initialize() method.`,
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
     * @param {int} msec Number of milliseconds to sleep for (1000 msec == 1 sec).
     */
    static sleep(msec) {
        const usec = msec * 1000;
        sleep.usleep(usec);
    }

    /** ------------------------------------------------------------------------ */
    /** ANALYZE TONE                                                             */
    /** ------------------------------------------------------------------------ */

    /**
     * Analyze the tone of the given text.
     * @param {string} text The text to analyze.
     * @return {object} Returns the response object from the Tone Analyzer service.
     * @example
     * response = {
     *     "document_tone": {
     *         "tones": [{
     *                 "score": 0.6165,
     *                 "tone_id": "sadness",
     *                 "tone_name": "Sadness"
     *             },
     *             {
     *                 "score": 0.829888,
     *                 "tone_id": "analytical",
     *                 "tone_name": "Analytical"
     *             }
     *         ]
     *     },
     *     "sentences_tone": [{
     *             "sentence_id": 0,
     *             "text": "Team, I know that times are tough!",
     *             "tones": [{
     *                 "score": 0.801827,
     *                 "tone_id": "analytical",
     *                 "tone_name": "Analytical"
     *             }]
     *         },
     *         {
     *             "sentence_id": 1,
     *             "text": "Product sales have been disappointing for the past three quarters.",
     *             "tones": [{
     *                     "score": 0.771241,
     *                     "tone_id": "sadness",
     *                     "tone_name": "Sadness"
     *                 },
     *                 {
     *                     "score": 0.687768,
     *                     "tone_id": "analytical",
     *                     "tone_name": "Analytical"
     *                 }
     *             ]
     *         },
     *         {
     *             "sentence_id": 2,
     *             "text": "We have a competitive product, but we need to do a better job of selling it!",
     *             "tones": [{
     *                 "score": 0.506763,
     *                 "tone_id": "analytical",
     *                 "tone_name": "Analytical"
     *             }]
     *         }
     *     ]
     * }
     * @see {@link https://cloud.ibm.com/apidocs/tone-analyzer?code=node#tone|Tone Analyzer} documentation provides details on the response object.
     * @async
     */
    async analyzeTone(text) {
        this._assertCapability(TJBot.CAPABILITIES.ANALYZE_TONE);

        const params = {
            toneInput: { text },
            contentType: 'application/json',
        };

        try {
            const body = await this._toneAnalyzer.tone(params);
            winston.silly(`repsonse from _toneAnalyzer.tone(): ${body}`);
            return body.result;
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.TONE_ANALYZER} service returned an error.`, err);
            throw err;
        }
    }

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
    async converse(message) {
        this._assertCapability(TJBot.CAPABILITIES.CONVERSE);

        // set up the session if needed
        if (!this._assistantSessionId) {
            try {
                const body = await this._assistant.createSession({
                    assistantId: this.configuration.converse.assistantId,
                });
                winston.silly(`repsonse from _assistant.createSession(): ${body}`);

                this._assistantSessionId = body.result.session_id;
            } catch (err) {
                winston.error(`error creating session for ${TJBot.SERVICES.ASSISTANT} service. please check that tj.configuration.converse.assistantId is defined.`);
                throw err;
            }
        }

        // define the conversational turn
        const turn = {
            assistantId: this.configuration.converse.assistantId,
            sessionId: this._assistantSessionId,
            input: {
                message_type: 'text',
                text: message,
            },
        };

        // send to Assistant service
        try {
            const body = await this._assistant.message(turn);
            winston.silly(`response from _assistant.message(): ${JSON.stringify(body)}`);
            const { result } = body;

            // this might not be necessary but in the past, conversational replies
            // came in through result.output.text, not result.output.generic
            let response;
            if (result.output.generic) {
                response = result.output.generic;
            } else if (result.output.text) {
                response = result.output.text;
            }

            const responseText = response.length > 0 ? response[0].text : '';
            const assistantResponse = {
                object: result.output,
                description: responseText,
            };
            winston.verbose(`received response from assistant: ${JSON.stringify(responseText)}`);
            return assistantResponse;
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.ASSISTANT} service returned an error.`, err);
            throw err;
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
        this._assertCapability(TJBot.CAPABILITIES.LISTEN);

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
                model: `${this.configuration.listen.language}_BroadbandModel`,
                inactivityTimeout: this.configuration.listen.inactivityTimeout || 60,
                interimResults: true,
                backgroundAudioSuppression: this.configuration.listen.backgroundAudioSuppression || 0.0,
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
    async see(classifierIds = []) {
        this._assertCapability(TJBot.CAPABILITIES.SEE);

        let filePath;
        let objects;

        try {
            winston.verbose('taking a photo with the camera');
            filePath = await this.takePhoto();
        } catch (err) {
            winston.error('an error occured taking a photo', err);
            throw err;
        }

        try {
            objects = await this.recognizeObjectsInPhoto(filePath, classifierIds);
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.VISUAL_RECOGNITION} service returned an error`, err);
            throw err;
        }

        return objects;
    }

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
    async recognizeObjectsInPhoto(filePath, classifierIds = []) {
        this._assertCapability(TJBot.CAPABILITIES.SEE);

        winston.verbose(`sending image to the ${TJBot.SERVICES.VISUAL_RECOGNITION} service to recognize objects`);

        const params = {
            imagesFile: fs.createReadStream(filePath),
            threshold: this.configuration.see.confidenceThreshold || 0.6,
            acceptLanguage: this.configuration.see.language || 'en',
        };

        if (classifierIds !== undefined && classifierIds.length > 0) {
            params.classifierIds = classifierIds;
            // params.owners = ['me']; // the API docs say this is not necessary to set when specifying classifierIds
        }

        try {
            const body = await this._visualRecognition.classify(params);
            winston.silly(`response from _visualRecognition.classify() ${JSON.stringify(body)}`);
            const result = body.result.images[0].classifiers[0].classes;
            return result;
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.VISUAL_RECOGNITION} service returned an error`, err);
            throw err;
        }
    }

    /**
     * Capture an image and save it in the given path.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @async
     */
    async takePhoto(filePath = '') {
        this._assertCapability(TJBot.CAPABILITIES.SEE);
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
            width: this.configuration.see.camera.width,
            height: this.configuration.see.camera.height,
            verticalFlip: this.configuration.see.camera.verticalFlip,
            horizontalFlip: this.configuration.see.camera.horizontalFlip,
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
        this._assertCapability(TJBot.CAPABILITIES.SHINE);

        // normalize the color
        const c = this._normalizeColor(color);

        // shine! will shine on both LEDs if they are both set up
        if (this._commonAnodeLed) {
            this._renderCommonAnodeLed(c);
        }

        if (this._neopixelLed) {
            const colors = new Uint32Array(1);

            if (this.configuration.shine.neopixel.grbFormat) {
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
        this._assertCapability(TJBot.CAPABILITIES.SHINE);

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
        this._assertCapability(TJBot.CAPABILITIES.SHINE);
        return colorToHex.all().map((elt) => elt.name);
    }

    /**
     * Get a random color.
     * @return {string} Random named color.
     */
    randomColor() {
        this._assertCapability(TJBot.CAPABILITIES.SHINE);

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
        this._assertCapability(TJBot.CAPABILITIES.SPEAK);

        // make sure we're trying to say something
        if (message === undefined || message === '') {
            winston.error('TJBot tried to speak an empty message.');
            return; // exit if there's nothing to say!
        }

        // default voice
        let voice = 'en-US_MichaelV3Voice';

        // check to see if the user has specified a voice
        if (this.configuration.speak.voice !== undefined) {
            winston.silly(`using voice specified in configuration: ${this.configuration.speak.voice}`);
            voice = this.configuration.speak.voice;
        } else if (this.configuration.speak.language === TJBot.LANGUAGES.SPEAK.ENGLISH_US) {
            // force MichaelV3 if the language is en-US
            voice = 'en-US_MichaelV3Voice';
            winston.silly(`forcing ${voice} since the language is English`);
        } else {
            winston.silly(`finding voice that matches gender ${this.configuration.robot.gender} and language ${this.configuration.speak.language}`);

            // load voices if they haven't been loaded yet
            if (!this._ttsVoices) {
                winston.verbose('loading TTS voices…');
                const body = await this._tts.listVoices();
                winston.silly(`response from _tts.listVoices(): ${JSON.stringify(body)}`);
                this._ttsVoices = body.result.voices;
                winston.verbose('TTS voices loaded');
            }

            // first figure out which voices will work for speak.langauge
            const { language } = this.configuration.speak;
            const languageMatches = this._ttsVoices.filter((v) => v.language === language);
            winston.silly(`candidate TTS voices from language match: ${JSON.stringify(languageMatches)}`);

            // now use *at least* a voice in the correct language
            // note that Watson TTS doesn't always return voices in the same order, so
            // this won't always pick the same voice every time
            if (languageMatches.length > 0) {
                voice = languageMatches[0].name;
                winston.silly(`provisionally selected TTS voice ${voice} to ensure language match`);
            }

            // finally, see if we have a gender match with robot.gender
            const { gender } = this.configuration.robot;
            const languageAndGenderMatches = languageMatches.sort((a, b) => a.name < b.name).filter((v) => v.gender === gender);

            if (languageAndGenderMatches.length > 0) {
                voice = languageAndGenderMatches[0].name;
                winston.silly(`final selection of TTS voice ${voice} due to language and gender match`);
            }

            winston.silly(`selected ${voice} as the ${this.configuration.robot.gender} voice for ${this.configuration.speak.language} `);
        }

        winston.verbose(`TJBot speaking with voice ${voice}`);

        const params = {
            text: message,
            voice,
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
            device: this.configuration.speak.speakerDeviceId,
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
    async translate(text, sourceLanguage, targetLanguage) {
        this._assertCapability(TJBot.CAPABILITIES.TRANSLATE);

        const params = {
            text,
            source: sourceLanguage,
            target: targetLanguage,
        };

        let translation;

        try {
            const body = await this._languageTranslator.translate(params);
            winston.silly(`response from _languageTranslator.translate(): ${JSON.stringify(body)}`);
            translation = body.result;
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.LANGUAGE_TRANSLATOR} service returned an error`, err);
            throw err;
        }

        if (Object.prototype.hasOwnProperty.call(translation, 'translations')) {
            if (translation.translations.length > 0
                && Object.prototype.hasOwnProperty.call(translation.translations[0], 'translation')) {
                return {
                    object: translation,
                    description: translation.translations[0].translation,
                };
            }
        }

        return {
            object: translation,
            description: '',
        };
    }

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
    async identifyLanguage(text) {
        this._assertCapability(TJBot.CAPABILITIES.TRANSLATE);

        const params = {
            text,
        };

        let identifiedLanguages;

        try {
            const body = await this._languageTranslator.identify(params);
            winston.silly(`response from _langaugeTranslator.identify(): ${JSON.stringify(body)}`);
            identifiedLanguages = body.result;
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.LANGUAGE_TRANSLATOR} service returned an error`, err);
            throw err;
        }

        return identifiedLanguages;
    }

    /**
     * Determines if TJBot can translate from the source language to the target language.
     * @param {string} sourceLanguage The source language (e.g. "en" for English).
     * @param {string} targetLanguage The target language (e.g. "es" for Spanish).
     * @return {bool} True if the `sourceLanguage` can be translated to the
     * `targetLanguage`, false otherwise.
     * @async
     */
    async isTranslatable(sourceLanguage, targetLanguage) {
        this._assertCapability(TJBot.CAPABILITIES.TRANSLATE);

        // lazy load of language translation models…
        if (this._translationModels === undefined) {
            winston.verbose('loading language models...');
            this._translationModels = await this._loadLanguageTranslationModels();
            winston.verbose('language models loaded');
        }

        if (this._translationModels[sourceLanguage] !== undefined) {
            return this._translationModels[sourceLanguage].includes(targetLanguage);
        }

        return false;
    }

    /**
     * Returns a list of languages that can TJBot can translate to from the given language.
     * @param {string} sourceLanguage The source language (e.g. "en" for English)
     * @return {array} List of languages that TJBot can translate to from the source langauge
     */
    async translatableLanguages(sourceLanguage) {
        this._assertCapability(TJBot.CAPABILITIES.TRANSLATE);

        // lazy load of language translation models…
        if (this._translationModels === undefined) {
            winston.verbose('loading language models...');
            this._translationModels = await this._loadLanguageTranslationModels();
            winston.verbose('language models loaded');
        }

        if (this._translationModels[sourceLanguage] !== undefined) {
            return this._translationModels[sourceLanguage];
        }

        return [];
    }

    /**
     * Returns the name of the given language code.
     * @param {string} languageCode Two-character language code (e.g. "en")
     * @return {string} Name of the language (e.g. "English"), or undefined if the language is unknown.
     */
    // eslint-disable-next-line class-methods-use-this
    languageForCode(languageCode) {
        switch (languageCode.toLowerCase()) {
        case 'ar':
            return 'Arabic';
        case 'de':
            return 'German';
        case 'en':
            return 'English';
        case 'es':
            return 'Spanish';
        case 'fr':
            return 'French';
        case 'it':
            return 'Italian';
        case 'ja':
            return 'Japanese';
        case 'ko':
            return 'Korean';
        case 'nl':
            return 'Dutch';
        case 'pt':
            return 'Portuguese';
        case 'zh':
            return 'Chinese';
        default:
            return undefined;
        }
    }

    /**
     * Returns the two-letter code for the given language.
     * @param {string} language Name of the language (e.g. "English")
     * @return {string} Two-letter language code for the language (e.g. "en"), or undefined if the language code is unknown.
     */
    // eslint-disable-next-line class-methods-use-this
    codeForLanguage(language) {
        switch (language.toLowerCase()) {
        case 'arabic':
            return 'ar';
        case 'german':
            return 'de';
        case 'english':
            return 'en';
        case 'spanish':
            return 'es';
        case 'french':
            return 'fr';
        case 'italian':
            return 'it';
        case 'japanese':
            return 'ja';
        case 'korean':
            return 'ko';
        case 'dutch':
            return 'nl';
        case 'portuguese':
            return 'pt';
        case 'chinese':
            return 'zh';
        default:
            return undefined;
        }
    }

    /**
     * Loads the list of language models that can be used for translation.
     * @private
     * @async
     */
    async _loadLanguageTranslationModels() {
        let models;

        try {
            const body = await this._languageTranslator.listModels({});
            winston.silly(`response from _languageTranslator.listModels(): ${JSON.stringify(body)}`);
            models = body.result;
        } catch (err) {
            winston.error(`the ${TJBot.SERVICES.LANGUAGE_TRANSLATOR} service returned an error`, err);
            throw err;
        }

        const translations = {};

        if (Object.prototype.hasOwnProperty.call(models, 'models')) {
            models.models.forEach((model) => {
                if (translations[model.source] === undefined) {
                    translations[model.source] = [];
                }
                if (!translations[model.source].includes(model.target)) {
                    translations[model.source].push(model.target);
                }
            });
        }

        return translations;
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
        this._assertCapability(TJBot.CAPABILITIES.WAVE);
        winston.info("Moving TJBot's arm back");
        this._motor.servoWrite(TJBot.SERVO.ARM_BACK);
    }

    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.CAPABILITIES.WAVE);
        winston.info("Raising TJBot's arm");
        this._motor.servoWrite(TJBot.SERVO.ARM_UP);
    }

    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.SERVO.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.CAPABILITIES.WAVE);
        winston.info("Lowering TJBot's arm");
        this._motor.servoWrite(TJBot.SERVO.ARM_DOWN);
    }

    /**
     * Waves TJBots's arm once.
     */
    async wave() {
        this._assertCapability(TJBot.CAPABILITIES.WAVE);
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
