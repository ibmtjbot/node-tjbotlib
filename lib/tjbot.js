/**
 * Copyright 2016-2018 IBM Corp. All Rights Reserved.
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

'use strict';

// useful node modules
const assert = require('assert');
const temp = require('temp').track();
const Promise = require('bluebird');
const fs = require('fs');
const sleep = require('sleep');
const colorToHex = require('colornames');
const cm = require('color-model');
const winston = require('winston');

// hardware modules
const Mic = require('mic');
const Raspistill = require('node-raspistill').Raspistill;

/**
 * TJBot
 * @param {String} hardware The set of hardware with which TJBot is equipped (see TJBot.prototype.hardware).
 * @param {Object} configuration Configuration parameters
 * @param {Object} credentials The set of service credentials needed for external services (see TJBot.prototype.services).
 * @constructor
 */
function TJBot(hardware, configuration, credentials) {
    if (!(this instanceof TJBot)) {
        throw new Error('"new" keyword required to create TJBot service instances');
    }

    // import configuration params
    this.configuration = Object.assign({}, TJBot.prototype.defaultConfiguration, configuration);

    // set logging level
    winston.level = this.configuration.log.level;

    // set up the hardware
    if (hardware == undefined) {
        throw new Error('must define a hardware configuration for TJBot');
    }

    hardware.forEach(function(device) {
        switch (device) {
        case 'camera':
            this._setupCamera();
            break;

        case 'led':
            this._setupLED();
            break;

        case 'microphone':
            this._setupMicrophone();
            break;

        case 'servo':
            this._setupServo(this.configuration.wave.servoPin);
            break;

        case 'speaker':
            this._setupSpeaker();
            break;
        }
    }, this);

    // set up additional services when their credentials are specified
    if (credentials != undefined) {
        // > conversation (renamed to assistant)
        // do this first so 'assistant' credentials will override 'conversation'
        // credentials, since 'assistant' is preferred
        if (credentials.hasOwnProperty('conversation')) {
            this._createServiceAPI('assistant', credentials['conversation']);
        }

        // > assistant
        if (credentials.hasOwnProperty('assistant')) {
            this._createServiceAPI('assistant', credentials['assistant']);
        }

        // > language translator
        if (credentials.hasOwnProperty('language_translator')) {
            this._createServiceAPI('language_translator', credentials['language_translator']);
        }

        // > speech to text
        if (credentials.hasOwnProperty('speech_to_text')) {
            this._createServiceAPI('speech_to_text', credentials['speech_to_text']);
        }

        // > text to speech
        if (credentials.hasOwnProperty('text_to_speech')) {
            this._createServiceAPI('text_to_speech', credentials['text_to_speech']);
        }

        // > tone analyzer
        if (credentials.hasOwnProperty('tone_analyzer')) {
            this._createServiceAPI('tone_analyzer', credentials['tone_analyzer']);
        }

        // > visual recognition
        if (credentials.hasOwnProperty('visual_recognition')) {
            this._createServiceAPI('visual_recognition', credentials['visual_recognition']);
        }
    }

    winston.info('Hello from TJBot! My name is ' + this.configuration.robot.name + '.');
    winston.verbose('TJBot library version ' + TJBot.prototype.version);
    
    winston.silly('TJBot configuration:');
    winston.silly(this.configuration);
}

/**
 * TJBot module version
 */
TJBot.prototype.version = 'v1.5.1';

/**
 * List of TJBot hardware and services.
 */
TJBot.prototype.capabilities = ['analyze_tone', 'converse', 'listen', 'see', 'shine', 'speak', 'translate', 'wave'];
TJBot.prototype.hardware = ['camera', 'led', 'microphone', 'servo', 'speaker'];
TJBot.prototype.services = ['assistant', 'language_translator', 'speech_to_text', 'text_to_speech', 'tone_analyzer', 'visual_recognition'];

/**
 * Default configuration parameters.
 */
TJBot.prototype.defaultConfiguration = {
    log: {
        level: 'info' // valid levels are 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
    },
    robot: {
        gender: 'male', // see TJBot.prototype.genders
        name: 'Watson'
    },
    listen: {
        microphoneDeviceId: 'plughw:1,0', // plugged-in USB card 1, device 0; see `arecord -l` for a list of recording devices
        inactivityTimeout: -1, // -1 to never timeout or break the connection. Set this to a value in seconds e.g 120 to end connection after 120 seconds of silence
        language: 'en-US' // see TJBot.prototype.languages.listen
    },
    wave: {
        servoPin: 7 // corresponds to BCM 7 / physical PIN 26
    },
    speak: {
        language: 'en-US', // see TJBot.prototype.languages.speak
        voice: undefined, // use a specific voice; if undefined, a voice is chosen based on robot.gender and speak.language
        speakerDeviceId: 'plughw:0,0' // plugged-in USB card 1, device 0; `see aplay -l` for a list of playback devices
    },
    see: {
        confidenceThreshold: {
            object: 0.5,
            text: 0.1
        },
        camera: {
            height: 720,
            width: 960,
            verticalFlip: false, // flips the image vertically, may need to set to 'true' if the camera is installed upside-down
            horizontalFlip: false // flips the image horizontally, should not need to be overridden
        },
        language: 'en'
    }
};

// List of all available configuration parameters
TJBot.prototype.configurationParameters = Object.keys(TJBot.prototype.defaultConfiguration);

// List of all available languages
TJBot.prototype.languages = {};
TJBot.prototype.languages.listen = ['ar-AR', 'en-UK', 'en-US', 'es-ES', 'fr-FR', 'ja-JP', 'pt-BR', 'zh-CN'];
TJBot.prototype.languages.speak = ['en-GB', 'en-US', 'es-US', 'ja-JP', 'pt-BR'];
TJBot.prototype.languages.see = ['en','ar','de','es','it','ja','ko'];
TJBot.prototype.genders = ['male', 'female'];

/** ------------------------------------------------------------------------ */
/** INTERNAL HARDWARE & WATSON SERVICE INITIALIZATION                        */
/** ------------------------------------------------------------------------ */

/**
 * Configure the Camera.
 */
TJBot.prototype._setupCamera = function() {
    winston.verbose('TJBot initializing Camera');

    this._camera = new Raspistill({
        width: this.configuration.see.camera.width,
        height: this.configuration.see.camera.height,
        noPreview: true,
        encoding: 'jpg',
        outputDir: './',
        verticalFlip: this.configuration.see.camera.verticalFlip,
        horizontalFlip: this.configuration.see.camera.horizontalFlip,
        time: 1
    });

    // versions of node-raspistill < 0.0.11 don't have the `time` option, so
    // force it in if we don't find it
    if (!this._camera.options.hasOwnProperty('time')) {
        winston.silly('node-raspistill camera option for `time` not found, swizzling it in');
        var self = this._camera;
        self.processOptionsOriginal = self.processOptions;
        self.processOptions = function(newOptions) {
            var options = self.processOptionsOriginal(newOptions);
            options.push('-t');
            options.push('1');
            return options;
        };
    }
};

/**
 * Configure the LED. The LED must be attached to the BCM 18 (PWM0) PIN.
 */
TJBot.prototype._setupLED = function() {
    winston.verbose('TJBot initializing LED');

    var ws281x = require('rpi-ws281x-native');

    // init with 1 LED
    this._led = ws281x;
    this._led.init(1);

    // capture 'this' context
    var self = this;

    // reset the LED before the program exits
    process.on('SIGINT', function() {
        self._led.reset();
        process.nextTick(function() {
            process.exit(0);
        });
    });
};

/**
 * Configure the microphone for speech recognition.
 */
TJBot.prototype._setupMicrophone = function() {
    winston.verbose('TJBot initializing microphone');

    var micParams = {
        'rate': '16000',
        'channels': '1',
        'debug': false,
        'exitOnSilence': 6
    };

    if (this.configuration.listen.microphoneDeviceId) {
        micParams.device = this.configuration.listen.microphoneDeviceId;
    }

    // create the microphone
    this._mic = Mic(micParams);

    // (re-)create the mic audio stream and pipe it to STT
    this._micInputStream = this._mic.getAudioStream();

    this._micInputStream.on('startComplete', function() {
        winston.debug('microphone started');
    });

    this._micInputStream.on('pauseComplete', function() {
        winston.debug('microphone paused');
    });

    // log errors in the mic input stream
    this._micInputStream.on('error', function(err) {
        winston.error('the microphone input stream experienced an error', err);
    });

    this._micInputStream.on('processExitComplete', function() {
        winston.debug('microphone exit');
    });

    // ignore silence
    this._micInputStream.on('silence', function() {
        winston.silly('microphone silence');
    });
};

/**
 * Configure the servo module for the given pin number.
 *
 * @param {Int} pin The pin number to which the servo is connected.
 */
TJBot.prototype._setupServo = function(pin) {
    var Gpio = require('pigpio').Gpio;

    winston.verbose('TJBot initializing servo motor on PIN ' + pin);

    this._motor = new Gpio(pin, {
        mode: Gpio.OUTPUT
    });
};

/**
 * Configure the speaker.
 */
TJBot.prototype._setupSpeaker = function() {
    // lazily load the sound-play library . This lib is used as it allows specification of speakerDeviceId
    this._soundplayer = require('sound-player');
};

/**
 * Configure the specified Watson service with the given credentials.
 *
 * @param {String} service The name of the service. Valid names are 'speech_to_text', 'text_to_speech', 'tone_analyzer' .
 * @param {Object} credentials The credentials, with keys for '{service}_username' and '{service}_password'.
 */
TJBot.prototype._createServiceAPI = function(service, credentials) {
    winston.verbose('TJBot initializing ' + service + ' service');

    assert(credentials, 'no credentials found for the ' + service + ' service');

    // capture 'this' context
    var self = this;

    // common authentication info
    var username = credentials['username'];
    var password = credentials['password'];
    var iam_apikey = credentials['apikey'];
    var url;
    var version;
    
    switch (service) {
    case 'assistant':
        // https://www.ibm.com/watson/developercloud/assistant/api/v1/        
        url = 'https://gateway.watsonplatform.net/assistant/api/';
        version = '2018-09-20';
        
        if (credentials.hasOwnProperty('url')) {
            url = credentials['url'];
        }
        
        if (credentials.hasOwnProperty('version')) {
            version = credentials['version'];
        }
        
        var AssistantV1 = require('watson-developer-cloud/assistant/v1');
        if (iam_apikey != undefined) {
            this._assistant = new AssistantV1({
                iam_apikey: iam_apikey,
                url: url,
                version: version
            });
        } else if (username != undefined && password != undefined) {
            this._assistant = new AssistantV1({
                username: username,
                password: password,
                url: url,
                version: version
            });
        } else {
            throw new Error(
                'Missing authentication credentials for assistant service: username/password or ' +
                'apikey are required.');
        }

        // cache of conversation contexts. hash key is the workspaceId of the conversation,
        // allowing TJ to run multiple conversations at once.
        this._assistantContext = {};
        break;

    case 'language_translator':
        // https://www.ibm.com/watson/developercloud/language-translator/api/v3/
        url = 'https://gateway.watsonplatform.net/language-translator/api/';
        version = '2018-05-01';
        
        if (credentials.hasOwnProperty('url')) {
            url = credentials['url'];
        }
            
        if (credentials.hasOwnProperty('version')) {
            version = credentials['version'];
        }

        var LanguageTranslatorV3 = require('watson-developer-cloud/language-translator/v3');
        if (iam_apikey != undefined) {
            this._languageTranslator = new LanguageTranslatorV3({
                iam_apikey: iam_apikey,
                url: url,
                version: version
            });
        } else if (username != undefined && password != undefined) {
            this._languageTranslator = new LanguageTranslatorV3({
                username: username,
                password: password,
                url: url,
                version: version
            });
        } else {
            throw new Error(
                'Missing authentication credentials for language_translator service: username/password or ' +
                'apikey are required.');
        }

        // load the list of language models
        this._loadLanguageTranslations().then(function(translations) {
            self._translations = translations;
        });
        break;

    case 'speech_to_text':
        // https://www.ibm.com/watson/developercloud/speech-to-text/api/v1/
        url = 'https://stream.watsonplatform.net/speech-to-text/api/';
            
        if (credentials.hasOwnProperty('url')) {
            url = credentials['url'];
        }
        
        var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
        if (iam_apikey != undefined ) {
            this._stt = new SpeechToTextV1({
                iam_apikey: iam_apikey,
                url: url
            });
        } else if (username != undefined && password != undefined) {
            this._stt = new SpeechToTextV1({
                username: username,
                password: password,
                url: url
            });
        } else {
            throw new Error(
                'Missing authentication credentials for speech_to_text service: username/password or ' +
                'apikey are required.');
        }
        
        break;

    case 'text_to_speech':
        // https://www.ibm.com/watson/developercloud/text-to-speech/api/v1/
        url = 'https://stream.watsonplatform.net/text-to-speech/api/';
            
        if (credentials.hasOwnProperty('url')) {
            url = credentials['url'];
        }

        var TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
        if (iam_apikey != undefined) {
            this._tts = new TextToSpeechV1({
                iam_apikey: iam_apikey,
                url: url
            });
        } else if (username != undefined && password != undefined) {
            this._tts = new TextToSpeechV1({
                username: username,
                password: password,
                url: url
            });
        } else {
            throw new Error(
                'Missing authentication credentials for text_to_speech service: username/password or ' +
                'apikey are required.');
        }
        
        this._tts.listVoices(null, function(error, data) {
            if (error) {
                winston.error('unable to retrieve TTS voices', error);
                self._ttsVoices = [];
            } else {
                self._ttsVoices = data.voices;
            }
        });
        break;

    case 'tone_analyzer':
        // https://www.ibm.com/watson/developercloud/tone-analyzer/api/v3/
        url = 'https://gateway.watsonplatform.net/tone-analyzer/api/';
        version = '2017-09-21';
            
        if (credentials.hasOwnProperty('url')) {
            url = credentials['url'];
        }
            
        if (credentials.hasOwnProperty('version')) {
            version = credentials['version'];
        }

        var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
        if (iam_apikey != undefined) {
            this._toneAnalyzer = new ToneAnalyzerV3({
                iam_apikey: iam_apikey,
                url: url,
                version: version
            });
        } else if (username != undefined && password != undefined) {
            this._toneAnalyzer = new ToneAnalyzerV3({
                username: username,
                password: password,
                url: url,
                version: version
            });
        } else {
            throw new Error(
                'Missing authentication credentials for tone_analyzer service: username/password or ' +
                'apikey are required.');
        }
        break;

    case 'visual_recognition':
        // https://www.ibm.com/watson/developercloud/visual-recognition/api/v3/
        url = 'https://gateway.watsonplatform.net/visual-recognition/api';
        version = '2018-03-19';
            
        if (credentials.hasOwnProperty('url')) {
            url = credentials['url'];
        }
            
        if (credentials.hasOwnProperty('version')) {
            version = credentials['version'];
        }

        var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
        if (iam_apikey != undefined) {
            this._visualRecognition = new VisualRecognitionV3({
                iam_apikey: iam_apikey,
                url: url,
                version: version
            });
        } else if (username != undefined && password != undefined) {
            this._visualRecognition = new VisualRecognitionV3({
                username: username,
                password: password,
                url: url,
                version: version
            });
        } else {
            throw new Error(
                'Missing authentication credentials for visual_recognition service: username/password or ' +
                'apikey are required.');
        }
        break;
            
    default:
        break;
    }
};

/**
 * Assert that TJBot is able to perform a specified capability.
 *
 * @param {String} capability The capability assert (see TJBot.prototype.capabilities).
 */
TJBot.prototype._assertCapability = function(capability) {
    switch (capability) {
    case 'analyze_tone':
        if (!this._toneAnalyzer) {
            throw new Error(
                'TJBot is not configured to analyze tone. ' +
                    'Please check that you included credentials for the Watson Tone Analyzer service.');
        }
        break;

    case 'converse':
        if (!this._assistant) {
            throw new Error(
                'TJBot is not configured to converse. ' +
                    'Please check that you included credentials for the Watson "assistant" service in the TJBot constructor.');
        }
        break;

    case 'listen':
        if (!this._mic) {
            throw new Error(
                'TJBot is not configured to listen. ' +
                    'Please check you included the "microphone" hardware in the TJBot constructor.');
        }
        if (!this._stt) {
            throw new Error(
                'TJBot is not configured to listen. ' +
                    'Please check that you included credentials for the Watson "speech_to_text" service in the TJBot constructor.');
        }
        break;

    case 'see':
        if (!this._camera) {
            throw new Error(
                'TJBot is not configured to see. ' +
                    'Please check you included the "camera" hardware in the TJBot constructor.');
        }
        if (!this._visualRecognition) {
            throw new Error(
                'TJBot is not configured to see. ' +
                    'Please check you included credentials for the Watson "visual_recognition" service in the TJBot constructor.');
        }
        break;

    case 'shine':
        if (!this._led) {
            throw new Error(
                'TJBot is not configured with an LED. ' +
                    'Please check you included the "led" hardware in the TJBot constructor.');
        }
        break;

    case 'speak':
        if (!this._soundplayer) {
            throw new Error(
                'TJBot is not configured to speak. ' +
                    'Please check you incldued the "speaker" hardware in the TJBot constructor.');
        }
        if (!this._tts) {
            throw new Error(
                'TJBot is not configured to speak. ' +
                    'Please check you included credentials for the Watson "text_to_speech" service in the TJBot constructor.');
        }
        break;

    case 'translate':
        if (!this._languageTranslator) {
            throw new Error(
                'TJBot is not configured to translate. ' +
                    'Please check you included credentials for the Watson "language_translator" service in the TJBot constructor.');
        }
        break;

    case 'wave':
        if (!this._motor) {
            throw new Error(
                'TJBot is not configured with an arm. ' +
                    'Please check you included the "servo" hardware in the TJBot constructor.');
        }
        break;
    }
};

/** ------------------------------------------------------------------------ */
/** UTILITY METHODS                                                          */
/** ------------------------------------------------------------------------ */

/**
 * Put TJBot to sleep.
 *
 * @param {Int} msec Number of milliseconds to sleep for (1000 msec == 1 sec).
 */
TJBot.prototype.sleep = function(msec) {
    var usec = msec * 1000;
    sleep.usleep(usec);
};

/** ------------------------------------------------------------------------ */
/** ANALYZE TONE                                                             */
/** ------------------------------------------------------------------------ */

/**
 * Analyze the tone of the given text.
 *
 * @param {String} text The text to analyze.
 */
TJBot.prototype.analyzeTone = function(text) {
    this._assertCapability('analyze_tone');

    var self = this;
    return new Promise(function(resolve, reject) {
        var params = {
            text: text
        };

        self._toneAnalyzer.tone(params, function(err, tone) {
            if (err) {
                winston.error('the tone_analyzer service returned an error.', err);
            } else {
                resolve(tone);
            }
        });
    });
};

/** ------------------------------------------------------------------------ */
/** CONVERSE                                                                 */
/** ------------------------------------------------------------------------ */

/**
 * Take a conversational turn in the given Watson conversation.
 *
 * @param {String} workspaceId The id of the workspace to use in the Assistant service.
 * @param {String} message The message to send to the Assistant service.
 * 
 * Returns a conversation response object.
 *
 */
TJBot.prototype.converse = function(workspaceId, message, callback) {
    this._assertCapability('converse');

    // save the conversational context
    if (this._assistantContext[workspaceId] == undefined) {
        this._assistantContext[workspaceId] = {};
    }

    var context = this._assistantContext[workspaceId];

    // define the conversational turn
    var turn = {
        workspace_id: workspaceId,
        input: {
            'text': message
        },
        context: context
    };

    // capture context
    var self = this;

    // send to Conversation service
    this._assistant.message(turn, function(err, response) {
        if (err) {
            winston.error('the assistant service returned an error.', err);
        } else {
            // cache the returned context
            self._assistantContext[workspaceId] = response.context;

            // return the response object and response text
            var responseText = response.output.text.length > 0 ? response.output.text[0] : '';
            var assistantResponse = {
                'object': response,
                'description': responseText
            };

            // log response text
            winston.verbose('TJBot response from conversation workspace id ' + workspaceId + ' ' + responseText + ' :');
            callback(assistantResponse);
        }
    });
};

/** ------------------------------------------------------------------------ */
/** LISTEN                                                                   */
/** ------------------------------------------------------------------------ */

/**
 * Listen for spoken utterances.
 */
TJBot.prototype.listen = function(callback) {
    // make sure we can listen
    this._assertCapability('listen');

    // capture 'this' context
    var self = this;

    // (re)initialize the microphone because if stopListening() was called, we don't seem to
    // be able to re-use the microphone twice
    this._setupMicrophone();

    // create the microphone -> STT recognizer stream
    // see this page for additional documentation on the STT configuration parameters:
    // https://www.ibm.com/watson/developercloud/speech-to-text/api/v1/#recognize_audio_websockets
    var params = {
        content_type: 'audio/l16; rate=16000; channels=1',
        interim_results: true, // need 'true' for watson-developer-cloud 3.x, otherwise results don't come back
        model: this.configuration.listen.language + '_BroadbandModel'
    };
    
    if (this.configuration.listen.inactivityTimeout != undefined) {
        params.inactivity_timeout = this.configuration.listen.inactivityTimeout;
    }
    
    winston.silly('recognizeUsingWebSocket() params:');
    winston.silly(params);
    
    this._recognizeStream = this._stt.recognizeUsingWebSocket(params);
    
    // create the mic -> STT recognizer -> text stream
    this._sttTextStream = this._micInputStream.pipe(this._recognizeStream);
    this._sttTextStream.setEncoding('utf8');

    // handle errors in the text stream
    this._sttTextStream.on('error', function(err) {
        if (err) {
            winston.error('the speech_to_text service returned an error.', err);

            // stop microphone
            self.stopListening();
            
            // attempt to reconnect
            self.listen(callback);
        }
    });

    // deliver STT data to the callback
    this._sttTextStream.on('data', function(transcript) {
        winston.info('TJBot heard: ' + transcript);

        if (callback != undefined) {
            callback(transcript);
        }
    });

    // start the microphone
    this._mic.start();
};

/**
 * Pause listening for spoken utterances
 */
TJBot.prototype.pauseListening = function() {
    // make sure we can listen
    this._assertCapability('listen');

    // pause the mic
    this._pauseListening();
};

/**
 * Internal method for pausing listening, used when
 * we want to play a sound but we don't want to assert
 * the 'listen' capability.
 */
TJBot.prototype._pauseListening = function() {
    if (this._mic != undefined) {
        winston.debug('listening paused');
        this._mic.pause();
    }
};

/**
 * Resume listening for spoken utterances
 */
TJBot.prototype.resumeListening = function() {
    // make sure we can listen
    this._assertCapability('listen');

    // resume the mic
    this._resumeListening();
};

/**
 * Internal method for resuming listening, used when
 * we want to play a sound but we don't want to assert
 * the 'listen' capability.
 */
TJBot.prototype._resumeListening = function() {
    if (this._mic != undefined) {
        winston.debug('listening resumed');
        this._mic.resume();
    }
};

/**
 * Stop listening for spoken utterances
 */
TJBot.prototype.stopListening = function() {
    // make sure we can listen
    this._assertCapability('listen');

    // stop the mic
    this._stopListening();
};

/**
 * Internal method for stopping listening, used when
 * we want to stop listening but we don't want to assert
 * the 'listen' capability.
 */
TJBot.prototype._stopListening = function() {
    if (this._mic != undefined) {
        winston.debug('listening stopped');

        // stop the mic
        this._mic.stop();

        // sleep for 1 second to wait for the mic to finish closing. this seems
        // necessary for a subsequent call to listen() to work correctly.
        this.sleep(1000);
    }
};

/** ------------------------------------------------------------------------ */
/** SEE                                                                      */
/** ------------------------------------------------------------------------ */

/**
 * Take a picture and identify the objects present.
 *
 * Returns a list of objects seen and their confidences.
 * See VisualRecognitionV3.prototype.classify for more detail on the
 * return object.
 */
TJBot.prototype.see = function(classifier_ids = []) {
    this._assertCapability('see');

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        winston.verbose('TJBot taking a photo');
        self.takePhoto().then(function(filePath) {
            resolve(self.recognizeObjectsInPhoto(filePath, classifier_ids));
        });
    });
};

/**
 * Describe photo by sending it to the Watson Visual Recognition Service.
 */
TJBot.prototype.recognizeObjectsInPhoto = function(filePath, classifier_ids) {
    this._assertCapability('see');

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        winston.debug('sending image to Watson Visual Recognition');
        var params = {
            images_file: fs.createReadStream(filePath),
            threshold: self.configuration.see.confidenceThreshold.object,
            'Accept-Language': self.configuration.see.language
        };

        if (classifier_ids != undefined) {
            params['classifier_ids'] = classifier_ids;
            params['owners'] = ['me'];
        }

        self._visualRecognition.classify(params, function(err, response) {
            if (err) {
                reject(err);
            } else {
                var result = response.images[0].classifiers[0].classes;
                resolve(result);
            }
        });
    });
};

/**
 * Take a picture and read the identified text.
 *
 * Returns a list of text strings identified and their locations in the image.
 * See VisualRecognitionV3.prototype.recognizeText for more detail on the
 * return object.
 */
TJBot.prototype.read = function() {
    this._assertCapability('see');

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        self.takePhoto().then(function(filePath) {
            resolve(self.recognizeTextInPhoto(filePath));
        });
    });
};

/**
 * Recognize text in photo by sending it to the Watson Visual Recognition Service.
 */
TJBot.prototype.recognizeTextInPhoto = function(filePath) {
    this._assertCapability('see');

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        winston.debug('sending image to Watson Visual Recognition to recognize text.');
        var params = {
            images_file: fs.createReadStream(filePath),
            threshold: self.configuration.see.confidenceThreshold.text,
            'Accept-Language': self.configuration.see.language
        };

        self._visualRecognition.recognizeText(params, function(err, response) {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
};

/**
 * Capture an image and save it in the given path. If no path is provided, 
 * it saves this file to a temp location.
 *
 * @param {String} filePath The path at which to save the image.
 *
 * Returns the photo data in a Buffer.
 */
TJBot.prototype.takePhoto = function(filePath) {
    this._assertCapability('see');

    // capture 'this' context
    var self = this;
    var path = '';
    var name = '';

    // if no file path provided, save to temp location
    if (filePath == null || filePath == '') {
        filePath = temp.path({
            prefix: 'tjbot'
        });
    }

    winston.debug('capturing image at path: ' + filePath);
    path = filePath.lastIndexOf('/') > 0 ? filePath.substring(0, filePath.lastIndexOf('/')) : ''; // save to current dir if no directory provided.
    name = filePath.substring(filePath.lastIndexOf('/') + 1);
    name = name.replace('.jpg', ''); // the node raspistill lib already adds encoding .jpg to file.

    // set the configuration options, which may have changed since the camera was initialized
    this._camera.setOptions({
        outputDir: path,
        fileName: name,
        width: this.configuration.see.camera.width,
        height: this.configuration.see.camera.height,
        verticalFlip: this.configuration.see.camera.verticalFlip,
        horizontalFlip: this.configuration.see.camera.horizontalFlip
    });

    return new Promise(function(resolve, reject) {
        self._camera.takePhoto().then(function(photobuffer) {
            var returnPath = path == '' ? (name + '.' + self._camera.getOptions().encoding) : (path + '/' + name + '.' + self._camera.getOptions().encoding);
            resolve(returnPath);
        }).catch(function(error) {
            winston.error('Error taking picture.', error);
            reject(error);
        });
    });
};

/** ------------------------------------------------------------------------ */
/** SHINE                                                                    */
/** ------------------------------------------------------------------------ */

/**
 * Change the color of the LED.
 *
 * @param {String} color The color to use. Must be interpretable by TJBot.prototype._normalizeColor.
 */
TJBot.prototype.shine = function(color) {
    this._assertCapability('shine');

    // convert to rgb
    var rgb = this._normalizeColor(color);

    // convert hex to the 0xGGRRBB format for the LED
    var grb = '0x' + rgb[3] + rgb[4] + rgb[1] + rgb[2] + rgb[5] + rgb[6];

    // shine!
    winston.verbose('TJBot shining my LED to RGB color ' + rgb);

    // set the LED color
    var colors = new Uint32Array(1);
    colors[0] = parseInt(grb);
    this._led.render(colors);
};

/**
 * Pulse the LED a single time.
 * @param {String} color The color to pulse the LED.
 * @param {Integer} duration The duration the pulse should last (default = 1 second, should be between 0.5 and 3 seconds)
 */
TJBot.prototype.pulse = function(color, duration = 1.0) {
    this._assertCapability('shine');

    if (duration < 0.5) {
        throw new Error('TJBot does not recommend pulsing for less than 0.5 seconds.');
    }
    if (duration > 2.0) {
        throw new Error('TJBot does not recommend pulsing for more than 3 seconds.');
    }

    // number of easing steps
    var numSteps = 20;

    // quadratic in-out easing
    var easeInOutQuad = function(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    };

    var ease = [];
    for (var i = 0; i < numSteps; i++) {
        ease.push(i);
    }

    ease = ease.map(function(x, i) {
        return easeInOutQuad(i, 0, 1, ease.length);
    });

    // normalize to 'duration' msec
    ease = ease.map(function(x) {
        return Math.round(x * duration * 1000);
    });

    // convert to deltas
    var easeDelays = [];
    for (var i = 0; i < ease.length - 1; i++) {
        easeDelays[i] = ease[i + 1] - ease[i];
    }

    // color ramp
    var rgb = this._normalizeColor(color).slice(1); // remove the #
    var hex = new cm.HexRgb(rgb);

    var colorRamp = [];
    for (var i = 0; i < numSteps / 2; i++) {
        var l = 0.0 + (i / (numSteps / 2)) * 0.5;
        colorRamp[i] = hex.toHsl().lightness(l).toRgb().toHexString().replace('#', '0x');
    }

    // capture context
    var self = this;

    // perform the ease
    return new Promise(function(resolve, reject) {
        for (var i = 0; i < easeDelays.length; i++) {
            var color = i < colorRamp.length ?
                colorRamp[i] :
                colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
            self.shine(color);
            self.sleep(easeDelays[i]);
        }
        resolve();
    });
};

/**
 * Get the list of colors recognized by TJBot.
 */
TJBot.prototype.shineColors = function() {
    this._assertCapability('shine');

    return colorToHex.all().map(function(elt, i, array) {
        return elt['name'];
    });
};

/**
 * Get a random color.
 */
TJBot.prototype.randomColor = function() {
    this._assertCapability('shine');

    var colors = this.shineColors();
    var randIdx = Math.floor(Math.random() * colors.length);
    var randColor = colors[randIdx];

    return randColor;
};

/**
 * Normalize the given color to #RRGGBB.
 *
 * @param {String} color The color to normalize. May be a hex number (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off", or "random", or a named color as interpreted by the `colornames` package. Hex numbers follow an RRGGBB format.
 */
TJBot.prototype._normalizeColor = function(color) {
    // assume undefined == "off"
    if (color == undefined) {
        color = 'off';
    }

    // is this "on" or "off"?
    if (color == 'on') {
        color = 'FFFFFF';
    } else if (color == 'off') {
        color = '000000';
    } else if (color == 'random') {
        color = this.randomColor();
    }

    // strip prefixes if they are present
    if (color.startsWith('0x')) {
        color = color.slice(2);
    }

    if (color.startsWith('#')) {
        color = color.slice(1);
    }

    // is this a hex number or a named color?
    var isHex = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i;
    var rgb = undefined;

    if (!isHex.test(color)) {
        rgb = colorToHex(color);
    } else {
        rgb = color;
    }

    // did we get something back?
    if (rgb == undefined) {
        throw new Error('TJBot did not understand the specified color "' + color + '"');
    }

    // prefix rgb with # in case it's not
    if (!rgb.startsWith('#')) {
        rgb = '#' + rgb;
    }

    // throw an error if we didn't understand this color
    if (rgb.length != 7) {
        throw new Error('TJBot did not understand the specified color "' + color + '"');
    }

    return rgb;
};

/** ------------------------------------------------------------------------ */
/** SPEAK                                                                    */
/** ------------------------------------------------------------------------ */

/**
 * Speak the given message.
 *
 * @param {String} message The message to speak.
 */
TJBot.prototype.speak = function(message) {
    this._assertCapability('speak');

    // make sure we're trying to say something
    if (message == undefined || message == '') {
        winston.error('TJBot tried to speak an empty message.');
        return; // exit if theres nothing to say!
    }

    // default voice
    var voice = 'en-US_MichaelVoice';

    // check to see if the user has specified a voice
    if (this.configuration.speak.voice != undefined) {
        voice = this.configuration.speak.voice;
    } else {
        // choose a voice based on robot.gender and speak.language
        // do this each time just in case the user changes robot.gender or
        // speak.language during execution
        for (var i in this._ttsVoices) {
            if (this._ttsVoices[i]['language'] == this.configuration.speak.language &&
                this._ttsVoices[i]['gender'] == this.configuration.robot.gender) {
                voice = this._ttsVoices[i]['name'];
                break;
            }
        }
    }

    winston.verbose('TJBot speaking with voice ' + voice);

    var utterance = {
        text: message,
        voice: voice,
        accept: 'audio/wav'
    };

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        temp.open('tjbot', function(err, info) {
            if (err) {
                reject('error: could not open temporary file for writing at path: ' + info.path);
            }

            self._tts.synthesize(utterance)
                .pipe(fs.createWriteStream(info.path))
                .on('close', function() {
                    winston.debug('wrote audio stream to temp file', info.path);
                    winston.verbose('TJBot speaking: ' + message);

                    resolve(self.play(info.path));
                });
        });
    });
};

/**
 * Play a given sound file.
 *
 * @param {String} soundFile The sound file to be played .
 */
TJBot.prototype.play = function(soundFile) {
    // capture 'this' context
    var self = this;

    // pause listening while we play a sound -- using the internal
    // method to avoid a capability check (and potential fail if the TJBot
    // isn't configured to listen)
    self._pauseListening();

    return new Promise(function(resolve, reject) {
        // if we don't have a speaker, throw an error
        if (self._soundplayer == undefined) {
            reject(new Error('unable to play audio, TJBot hardware doesn\'t include a "speaker"'));
            return;
        }

        // initialize soundplayer lib
        var speakerOptions = {
            filename: soundFile,
            gain: 100,
            debug: true,
            player: 'aplay', // "afplay" "aplay" "mpg123" "mpg321"
            device: self.configuration.speak.speakerDeviceId
        };
        var player = new self._soundplayer(speakerOptions);

        winston.debug('Playing audio with parameters: ', speakerOptions);

        player.on('complete', function() {
            winston.debug('audio playback finished');

            // resume listening
            self._resumeListening();

            // done
            resolve();
        });

        player.on('error', function(err) {
            winston.error('Error occurred while playing audio :', err);
        });

        // play the audio
        player.play(soundFile);
    });
};

/** ------------------------------------------------------------------------ */
/** TRANSLATE                                                                */
/** ------------------------------------------------------------------------ */

/**
 * Translates the given tesxt from the source language to the target language.
 *
 * @param {String} text The text to translate.
 * @param {String} sourceLanguage The source language (e.g. "en" for English)
 * @param {String} targetLanguage The target language (e.g. "es" for Spanish)
 */
TJBot.prototype.translate = function(text, sourceLanguage, targetLanguage) {
    this._assertCapability('translate');

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        self._languageTranslator.translate({
            text: text,
            source: sourceLanguage,
            target: targetLanguage
        }, function(err, translation) {
            if (err) {
                reject(err);
            } else {
                resolve(translation);
            }
        });
    });
};

/**
 * Identifies the language of the given text.
 *
 * @param {String} text The text to identify.
 *
 * Returns a list of identified languages in the text.
 */
TJBot.prototype.identifyLanguage = function(text) {
    this._assertCapability('translate');

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        self._languageTranslator.identify({
            text: text
        }, function(err, identifiedLanguages) {
            if (err) {
                reject(err);
            } else {
                resolve(identifiedLanguages);
            }
        });
    });
};

/**
 * Determines if TJBot can translate from the source language to the target language.
 *
 * @param {String} sourceLanguage The source language (e.g. "en" for English)
 * @param {String} targetLanguage The target language (e.g. "es" for Spanish)
 *
 * Returns a Promise that resolves to whether the sourceLanguage can be translated
 * to the targetLanguage.
 */
TJBot.prototype.isTranslatable = function(sourceLanguage, targetLanguage) {
    this._assertCapability('translate');

    // capture 'this' context
    var self = this;

    // load the list of language models available for translation
    if (this._translations == undefined) {
        return this._loadLanguageTranslations().then(function(translations) {
            self._translations = translations;
            return self._isTranslatable(sourceLanguage, targetLanguage);
        });
    } else {
        return new Promise(function(resolve, reject) {
            resolve(self._isTranslatable(sourceLanguage, targetLanguage));
        });
    }
};

/**
 * Loads the list of language models that can be used for translation.
 */
TJBot.prototype._loadLanguageTranslations = function() {
    // capture 'this' context
    var self = this;
    return new Promise(function(resolve, reject) {
        if (self._translations == undefined) {
            self._languageTranslator.listModels({}, function(err, models) {
                var translations = {};
                if (err) {
                    winston.error('unable to retrieve list of language models for translation', err);
                    reject(err);
                } else {
                    if (models.hasOwnProperty('models')) {
                        models.models.forEach((model) => {
                            if (translations[model.source] == undefined) {
                                translations[model.source] = [];
                            }
                            if (!translations[model.source].includes(model.target)) {
                                translations[model.source].push(model.target);
                            }
                        });
                    } else {
                        winston.error('unexpected result received for list of language models for translation');
                        reject(err);
                    }
                }
                resolve(translations);
            });
        } else {
            resolve(self._translations);
        }
    });
};

/**
 * Determines if TJBot can translate from the source language to the target language.
 * Assumes that the language model list has been loaded.
 *
 * @param {String} sourceLanguage The source language (e.g. "en" for English)
 * @param {String} targetLanguage The target language (e.g. "es" for Spanish)
 *
 * Returns true if the sourceLanguage can be translated to the targetLanguage.
 */
TJBot.prototype._isTranslatable = function(sourceLanguage, targetLanguage) {
    if (this._translations[sourceLanguage] != undefined) {
        return this._translations[sourceLanguage].includes(targetLanguage);
    }

    return false;
};

/** ------------------------------------------------------------------------ */
/** WAVE                                                                     */
/** ------------------------------------------------------------------------ */

TJBot.prototype._SERVO_ARM_BACK = 500;
TJBot.prototype._SERVO_ARM_UP = 1400;
TJBot.prototype._SERVO_ARM_DOWN = 2300;

/**
 * Move TJ's arm all the way back.
 */
TJBot.prototype.armBack = function() {
    // make sure we have an arm
    this._assertCapability('wave');
    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_BACK);
};

/**
 * Raise TJ's arm.
 */
TJBot.prototype.raiseArm = function() {
    // make sure we have an arm
    this._assertCapability('wave');
    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_UP);
};

/**
 * Lower TJ's arm.
 */
TJBot.prototype.lowerArm = function() {
    // make sure we have an arm
    this._assertCapability('wave');
    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_DOWN);
};

/**
 * Wave TJ's arm.
 */
TJBot.prototype.wave = function() {
    this._assertCapability('wave');

    var delay = 200;

    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_UP);
    this.sleep(delay);

    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_DOWN);
    this.sleep(delay);

    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_UP);
    this.sleep(delay);

    return true;
};

/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */

/**
 * Export TJBot!
 */
module.exports = TJBot;
