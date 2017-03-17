/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

// Watson API
var Watson = require('watson-developer-cloud');

// useful node modules
var assert = require('assert');
var pick = require('object.pick');
var temp = require('temp').track();
var await = require('asyncawait/await');
var Promise = require('bluebird');
var fs = require('fs');
var sleep = require('sleep');
var colorToHex = require('colornames');
var cm = require('color-model');
var AudioContext = require('web-audio-api').AudioContext
var sem = require('semaphore')(1);

// hardware modules
var mic = require('mic');
var APlay = require('aplay');


/**
 * TJBot
 * @param {String} [hardware] The set of hardware with which TJBot is equipped (see TJBot.prototype.hardware).
 * @param {Object} configuration Configuration parameters
 * @param {Object} credentials The set of service credentials needed for external services (see TJBot.prototype.services).
 * @constructor
 */
function TJBot(hardware, configuration, credentials) {
    if (!(this instanceof TJBot)) {
        throw new Error('"new" keyword required to create TJBot service instances')
    }

    // import configuration params
    this.config = configuration;

    // set up the hardware
    if (hardware == undefined) {
        throw new Error('must define a hardware configuration for TJBot');
    }

    hardware.forEach(function(device) {
        switch (device) {
            case 'camera':
                //this._setupCamera()
                // TODO
                break;

            case 'led':
                this._setupLED(this.config.ledPin);
                break;

            case 'microphone':
                this._setupMicrophone();
                break;

            case 'servo':
                this._setupServo(this.config.servoPin);
                break;

            case 'speaker':
                this._speechQueue = require('fifo')();
                break;
        }
    }, this);

    // set up additional services when their credentials are specified

    if (credentials != undefined) {
        // > conversation
        if (credentials.hasOwnProperty('conversation') && credentials.conversation.password != '') {
            var creds = credentials['conversation'];
            this._createServiceAPI('conversation', creds);
        }

        // > speech to text
        if (credentials.hasOwnProperty('speech_to_text') && credentials.speech_to_text.password != '') {
            var creds = credentials['speech_to_text'];
            this._createServiceAPI('speech_to_text', creds);
        }

        // > text to speech
        if (credentials.hasOwnProperty('text_to_speech') && credentials.text_to_speech.password != '') {
            var creds = credentials['text_to_speech'];
            this._createServiceAPI('text_to_speech', creds);
        }

        // > language translator
        if (credentials.hasOwnProperty('language_tranlator') && credentials.language_tranlator.password != '') {
            var creds = credentials['language_tranlator'];
            this._createServiceAPI('language_tranlator', creds);
        }

        // > tone analyzer
        if (credentials.hasOwnProperty('tone_analyzer') && credentials.tone_analyzer.password != '') {
            var creds = credentials['tone_analyzer'];
            this._createServiceAPI('tone_analyzer', creds);
        }

        // > visual recognition
        if (credentials.hasOwnProperty('visual_recognition') && credentials.visual_recognition.key != '') {
            var creds = credentials['visual_recognition'];
            this._createServiceAPI('visual_recognition', creds);
        }
    }

    if (this.config.verboseLogging) {
        console.log("Hello from TJBot!");
    }
}

/**
 * TJBot module version
 */
TJBot.prototype.version = 'v1.0.1';

/**
 * List of TJBot hardware and services.
 */
TJBot.prototype.capabilities = ['listen', 'see', 'shine', 'speak', 'tone', 'tweet', 'wave'];
TJBot.prototype.hardware = ['camera', 'led', 'microphone', 'servo', 'speaker'];
TJBot.prototype.services = ['conversation', 'speech_to_text', 'text_to_speech', 'tone_analyzer'];
TJBot.prototype._isPlaying = false;

/**
 * Configure the specified Watson service with the given credentials.
 *
 * @param {String} service The name of the service. Valid names are 'speech_to_text', 'text_to_speech', 'tone_analyzer' .
 * @param {Object} credentials The credentials, with keys for '{service}_username' and '{service}_password'.
 */
TJBot.prototype._createServiceAPI = function(service, credentials) {
    if (this.config.verboseLogging) {
        console.info("> TJBot initializing " + service + " service");
    }

    assert(credentials, "no credentials found for the " + service + " service");

    // capture 'this' context
    var self = this;

    switch (service) {
        case 'conversation':
            assert(credentials.hasOwnProperty('username'), "credentials for the " + service + " service missing 'username'");
            assert(credentials.hasOwnProperty('password'), "credentials for the " + service + " service missing 'password'");

            this._conversation = Watson.conversation({
                username: credentials['username'],
                password: credentials['password'],
                version: 'v1',
                version_date: '2016-07-11'
            });

            // cache of conversation contexts. hash key is the workspaceId of the conversation,
            // allowing TJ to run multiple conversations at once.
            this._conversationContext = {};
            break;

        case 'speech_to_text':
            assert(credentials.hasOwnProperty('username'), "credentials for the " + service + " service missing 'username'");
            assert(credentials.hasOwnProperty('password'), "credentials for the " + service + " service missing 'password'");

            this._stt = Watson.speech_to_text({
                username: credentials['username'],
                password: credentials['password'],
                version: 'v1'
            });
            break;

        case 'language_tranlator':
            assert(credentials.hasOwnProperty('username'), "credentials for the " + service + " service missing 'username'");
            assert(credentials.hasOwnProperty('password'), "credentials for the " + service + " service missing 'password'");

            this._translator = Watson.language_translator({
                username: credentials['username'],
                password: credentials['password'],
                version: 'v2',
                url: credentials['url']
            });
            break;

        case 'text_to_speech':
            assert(credentials.hasOwnProperty('username'), "credentials for the " + service + " service missing 'username'");
            assert(credentials.hasOwnProperty('password'), "credentials for the " + service + " service missing 'password'");

            this._tts = Watson.text_to_speech({
                username: credentials['username'],
                password: credentials['password'],
                version: 'v1'
            });
            this._tts.voices(null, function(error, data) {
                if (error)
                    console.log('Error retriving tts voices:', error);
                else
                    self._ttsVoices = data.voices;
            });
            break;

        case 'tone_analyzer':
            assert(credentials.hasOwnProperty('username'), "credentials for the " + service + " service missing 'username'");
            assert(credentials.hasOwnProperty('password'), "credentials for the " + service + " service missing 'password'");

            this._toneAnalyzer = Watson.tone_analyzer({
                username: credentials['username'],
                password: credentials['password'],
                version: 'v3',
                version_date: '2016-05-19'
            });
            break;

        case 'visual_recognition':
            assert(credentials.hasOwnProperty('key'), "credentials for the " + service + " service missing 'key'");
            //assert(credentials.hasOwnProperty('version'), "credentials for the " + service + " service missing 'version'");
            if (credentials['version'] == "") credentials['version'] = "2016-05-19"
            var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
            this._visualRecognition = new VisualRecognitionV3({
                api_key: credentials['key'],
                version_date: credentials['version']
            });
            break;


        default:
            break;
    }
}

/**
 * Configure the LED for the given pin number.
 *
 * @param {Int} pin The pin number to which the LED is connected.
 */
TJBot.prototype._setupLED = function(pin) {
    if (this.config.verboseLogging) {
        console.info("> TJBot initializing LED");
    }
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
        })
    });
}

/**
 * Configure the servo module for the given pin number.
 *
 * @param {Int} pin The pin number to which the servo is connected.
 */
TJBot.prototype._setupServo = function(pin) {
    var Gpio = require('pigpio').Gpio;
    if (this.config.verboseLogging) {
        console.info("> TJBot initializing servo motor");
    }

    this._motor = new Gpio(pin, {
        mode: Gpio.OUTPUT
    });
}

/**
 * Configure the microphone for speech recognition.
 */
TJBot.prototype._setupMicrophone = function() {
    var self = this;
    if (this.config.verboseLogging) {
        console.info("> TJBot initializing microphone");
    }
    var micParams = {
        'rate': '44100',
        'channels': '2',
        'debug': false,
        'exitOnSilence': 6
    };
    if (this.config.microphoneDeviceId) micParams.device = this.config.microphoneDeviceId;
    this._mic = mic(micParams);

    // (re-)create the mic audio stream and pipe it to STT
    this._micInputStream = this._mic.getAudioStream();

    this._micInputStream.on('startComplete', function() {
        console.log("> microphone started");
    });

    this._micInputStream.on('pauseComplete', function() {
        if (self.config.verboseLogging) console.log("> microphone paused");
    });

    // log errors in the mic input stream
    this._micInputStream.on('error', function(err) {
        console.error("error in microphone input stream: " + err);
    });

    // ignore silence
    this._micInputStream.on('silence', function() {});

    this._micInputStream.on('processExitComplete', function() {
        if (self.config.verboseLogging) console.log("> microphone exit");
    });

    // TJ is listening!
    console.log("TJBot is listening, you may speak now.");
}

/**
 * [_sendAudioWatsonSpeechtoText description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */

TJBot.prototype._sendAudioWatsonSpeechtoText = function(callback) {

    if (this.config.verboseLogging) console.log("> opening audiostream with watson speech to text")
    // capture context
    var self = this;

    // create the mic -> stt recognizer stream
    // see this page for reference on other config params for stt:
    // https://www.ibm.com/watson/developercloud/speech-to-text/api/v1/#recognize_audio_websockets
    this._micRecognizeStream = this._stt.createRecognizeStream({
        content_type: 'audio/l16; rate=44100; channels=2',
        inactivity_timeout: this.config.voice.timeout,
        model: this.config.voice.language + '_BroadbandModel'
    });

    // create the mic -> stt -> text stream
    this._micTextStream = this._micInputStream.pipe(this._micRecognizeStream);
    this._micTextStream.setEncoding('utf8');

    // log errors in the text stream
    this._micTextStream.on('error', function(err) {
        console.error("The speech_to_text service returned an error.");
        console.error("Raw error:");
        console.error(err) //(JSON.stringify(err));    // Circular json error
        // Attempt to reconnect to TTS on error. Useful when connection breaks due to
        self._mic.resume(); //if paused
        if (self.config.ttsReconnect) {
            console.error("=====================\nAttempting to reconnect in 2 seconds");
            self._sendAudioWatsonSpeechtoText(callback);
        }
    });

    // pass any data captured by STT to the callback
    this._micTextStream.on('data', function(transcriptMessage) {
        console.log("TJ heard: " + transcriptMessage);

        if (callback != undefined) {
            callback(transcriptMessage);
        }
    });

    // start the mic
    this._mic.start();
}


/**
 * Assert that TJBot is able to perform a specified capability.
 *
 * @param {String} capability The capability assert (see TJBot.prototype.capabilities).
 */
TJBot.prototype._assertCapability = function(capability) {
    switch (capability) {
        case 'listen':
            if (!this._mic || !this._stt) {
                throw new Error('TJBot is not configured to listen. Please check you included the correct hardware capabilities in the TJBot constructor.');
            }
            break;

        case 'see':
            if (!this._visualRecognition) {
                throw new Error('TJBot is not configured to see. Please check you included the correct hardware capabilities in the TJBot constructor.');
            }
            break;

        case 'shine':
            if (!this._led) {
                throw new Error('TJBot is not configured with an LED. Please check you included the correct hardware capabilities in the TJBot constructor.');
            }
            break;

        case 'speak':
            if (!this._tts) {
                throw new Error('TJBot is not configured to speak. Please check you included the correct hardware capabilities in the TJBot constructor.');
            }
            break;

        case 'tone':
            if (!this._toneAnalyzer) {
                throw new Error('TJBot is not configured to analyze tone. ');
            }
            break;

        case 'wave':
            if (!this._motor) {
                throw new Error('TJBot is not configured with an arm. Please add servo to the hardware list.');
            }
            break;
    }
}

/**
 * Put TJ to sleep.
 *
 * @param {Int} msec Number of milliseconds to sleep for (1000 msec == 1 sec).
 */
TJBot.prototype.sleep = function(msec) {
    var usec = msec * 1000;
    sleep.usleep(usec);
}

/**
 * Normalize the given color to #RRGGBB.
 *
 * @param {String} color The color to normalize. May be a hex number (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off", or "random", or a named color as interpreted by the `colornames` package. Hex numbers follow an RRGGBB format.
 */
TJBot.prototype._normalizeColor = function(color) {
    // assume undefined == "off"
    if (color == undefined) {
        color = "off";
    }

    // is this "on" or "off"?
    if (color == "on") {
        color = "FFFFFF";
    } else if (color == "off") {
        color = "000000";
    } else if (color == "random") {
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
}

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
    var grb = "0x" + rgb[3] + rgb[4] + rgb[1] + rgb[2] + rgb[5] + rgb[6];

    // shine!
    //console.log("TJBot shining the light " + rgb);

    // set the LED color
    var colors = new Uint32Array(1);
    colors[0] = parseInt(grb);
    this._led.render(colors);
    return true; // test for completion
}

/**
 * Pulse the LED a single time.
 * @param {String} color The color to pulse the LED.
 * @param {Integer} duration The duration the pulse should last (default = 1 second)
 */
TJBot.prototype.pulseOnce = function(color, duration = 1.0) {
    this._assertCapability('shine');

    if (duration < 0.5) {
        throw new Error("TJBot does not recommend pulsing for less than 0.5 seconds.");
    }

    // number of easing steps
    var numSteps = 20;

    // quadratic in-out easing
    var easeInOutQuad = function(t, b, c, d) {
        if ((t /= d / 2) < 1) return c / 2 * t * t + b;
        return -c / 2 * ((--t) * (t - 2) - 1) + b;
    }

    var ease = [];
    for (var i = 0; i < numSteps; i++) {
        ease.push(i);
    }

    ease = ease.map(function(x, i) {
        return easeInOutQuad(i, 0, 1, ease.length);
    });

    // normalize to 'duration' msec
    ease = ease.map(function(x) {
        return Math.round(x * duration * 1000)
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
}

/**
 * Continuously pulse the LED until stopPulse is called.
 *
 * @param {String} color The color to pulse the LED.
 * @param {Integer} duration The duration of the pulse in seconds (default = 1 second).
 * @param {Integer} delay The delay between pulses in seconds (default = 2 seconds). We recommend setting this to at least 1 second, and no less than half a second. Smaller values may cause interference with the Node.js event loop, especially when running interactively.
 */
TJBot.prototype.pulse = function(color, duration = 1.0, delay = 2.0) {
    if (delay < 0.5) {
        throw new Error("TJBot does not recommend pulsing with a delay lower than 0.5 seconds.");
    }

    this._isPulsing = true;

    var self = this;

    var doPulse = function() {
        self.pulseOnce(color, duration, delay).then(function() {
            if (self._isPulsing) {
                // setTimeout lets us return back to the main event loop
                // before recursing, which helps when running tjbot
                // interactively
                setTimeout(function() {
                    // make sure we didn't cancel
                    if (self._isPulsing) {
                        return doPulse();
                    }
                }, 1000 * delay);
            }
        });
    }

    return doPulse();
}

/**
 * Is the LED pulsing?
 */
TJBot.prototype.isPulsing = function() {
    return this._isPulsing;
}

/**
 * Stop pulsing the LED.
 */
TJBot.prototype.stopPulsing = function() {
    this._isPulsing = false;
    this.shine('off');
}

/**
 * Get the list of colors recognized by TJBot.
 */
TJBot.prototype.shineColors = function() {
    this._assertCapability('shine');

    return colorToHex.all().map(function(elt, i, array) {
        return elt['name'];
    });
}

/**
 * Get a random color.
 */
TJBot.prototype.randomColor = function() {
    this._assertCapability('shine');

    var colors = this.shineColors();
    var randIdx = Math.floor(Math.random() * colors.length);
    var randColor = colors[randIdx];

    return randColor;
}

/**
 * Take a conversational turn in the given Watson conversation.
 *
 * @param {String} workspaceId The id of the workspace to use in the Conversation service.
 * @param {String} message The message to send to the Conversation service.
 *
 * returns a conversation api response object
 */

TJBot.prototype.converse = function(workspaceId, message, callback) {
    this._assertCapability('converse');

    // save the conversational context
    if (this._conversationContext[workspaceId] == undefined) {
        this._conversationContext[workspaceId] = {};
    }

    var context = this._conversationContext[workspaceId];

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
    this._conversation.message(turn, function(err, conversationResponseObject) {
        if (err) {
            console.error("The conversation service returned an error. This may indicate you have exceeded your usage quota for the service.");
            console.error("Raw error:");
            console.error(JSON.stringify(err));
        } else {
            // cache the returned context
            self._conversationContext[workspaceId] = conversationResponseObject.context;

            // return the response object and response text
            var responseText = conversationResponseObject.output.text.length > 0 ? conversationResponseObject.output.text[0] : "";
            var response = {
                "object": conversationResponseObject,
                "description": responseText
            };
            callback(response);
        }
    });
}



/**
 * [see take a picture, store in tmp location, send to vision recog service, ]
 * @param  {[type]} mode [string classify | text ]
 * classify mode : describe objects in image
 * text mode : extract text from image.
 * @return {[type: promise]}      [returns a promise and a response json object]
 * response object var response = {
     "object": visionResponseObject,
     "description": imageDescription
 };
 */
TJBot.prototype.see = function(mode) {
    this._assertCapability('see');
    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        temp.open('tjbot', function(err, info) {
            if (err) {
                reject("TJBot error: could not open temporary file for writing at path: " + info.path);
            }
            var filePath = info.path + ".jpg";
            self.captureImage(filePath).then(function(filePath) {

                resolve(self.callVisualRecognition(mode, filePath));
            });

        });
    });
}

/**
 * [callVisualRecognition call the visual recognition service with a given mode]
 * @param  {[type]} mode [description]
 * @return {[promise]}      [returns a response json object that has two variables - vision object and description]
 */
TJBot.prototype.callVisualRecognition = function(mode, filePath) {
    var self = this;
    var imageDescription = null;
    return new Promise(function(resolve, reject) {
        var visionParams = {
            images_file: fs.createReadStream(filePath),
            threshold: self.config.visionConfidenceThreshold
        };
        if (mode == "classify" || mode === undefined) {
            self._visualRecognition.classify(visionParams, function(err, visionResponseObject) {
                if (err) {
                    console.log(err);
                    reject(err)
                } else {

                    var visionClassifierResult = visionResponseObject.images[0].classifiers[0].classes
                    //console.log(visionClassifierResult, " === ", Array.isArray(visionClassifierResult))
                    if (Array.isArray(visionClassifierResult)) {
                        imageDescription = "The objects I see are ";
                        visionClassifierResult.forEach(function(tag) {
                            imageDescription = imageDescription + ", " + tag.class
                        })
                        if (self.config.verboseLogging) console.log(imageDescription)
                        var response = {
                            "object": visionResponseObject,
                            "description": imageDescription
                        };
                        resolve(response); // return classifier response object and image description
                    } else {
                        var response = {
                            "object": visionResponseObject,
                            "description": imageDescription
                        };
                        resolve(response); // return classifier response object and image description
                    }
                }
            });
        } else if (mode == "text") {
            self._visualRecognition.recognizeText(visionParams, function(err, visionResponseObject) {
                visionParams = {
                    images_file: fs.createReadStream(filePath),
                    threshold: self.config.visionTextConfidenceThreshold
                };
                if (err) {
                    console.log(err);
                    reject(err)
                } else {
                    if (self.config.verboseLogging) console.log(visionResponseObject.images[0].text)
                    var response = {
                        "object": visionResponseObject,
                        "description": visionResponseObject.images[0].text
                    };
                    resolve(response); // return classifier response object and image description
                }
            });
        }
    });
}


/**
 * [captureImage capture an image and save to given file path]
 * @param  {[type]} filePath [location where image should be stored]
 * @return {[type]}      [returns a promise]
 */
TJBot.prototype.captureImage = function(filePath) {
    //this._assertCapability('see');
    // capture 'this' context
    var self = this;
    return new Promise(function(resolve, reject) {
        var cameraParams = [];

        self.config.cameraParams.height ? cameraParams.push('-h', self.config.cameraParams.height) : cameraParams.push('-h', self.defaultConfiguration.cameraParams.height);
        self.config.cameraParams.width ? cameraParams.push('-w', self.config.cameraParams.width) : cameraParams.push('-w', self.defaultConfiguration.cameraParams.width);
        if (self.config.cameraParams.vflip) cameraParams.push('-vf');
        if (self.config.cameraParams.hflip) cameraParams.push('-hf');
        cameraParams.push('--nopreview'); // no image preview .. makes capture 10x faster
        cameraParams.push('-o', filePath);
        cameraParams.push('-t', 1) // no time delay

        console.log(cameraParams)
        var spawn = require('child_process').spawn('raspistill', cameraParams);
        spawn.on('exit', function(code) {
            if (self.config.verboseLogging) {
                console.info("> saved image to temp file [" + filePath + "]" + "with exit code, " + code);
            }
            resolve(filePath);
        });

        spawn.on('error', function() {
            if (self.config.verboseLogging) {
                console.error("> there was an error capturing image [" + filePath + "]");
            }
            reject();
        });
    });

}


/**
 * Speak the given message.
 *
 * @param {String} message The message to speak.
 */

TJBot.prototype.speak = function(message) {
    this._assertCapability('speak');

    // make sure we're trying to say something
    if (message == undefined) {
        throw new Error("TJBot tried to speak a null message.");
    }

    //get voice
    var selectedVoice = "en-US_MichaelVoice"; //default voice if is not possible to find a better one
    for (var i in this._ttsVoices) {
        if (this._ttsVoices[i]["language"] == this.config.voice.language && this._ttsVoices[i]["gender"] == this.config.voice.gender) {
            selectedVoice = this._ttsVoices[i]["name"];
            break;
        }
    }
    if (this.config.verboseLogging) {
        console.log("> Selected voice: " + selectedVoice);
    }

    var utterance = {
        text: message,
        voice: selectedVoice,
        accept: 'audio/wav'
    };

    // capture 'this' context
    var self = this;

    return new Promise(function(resolve, reject) {
        temp.open('tjbot', function(err, info) {
            if (err) {
                reject("TJBot error: could not open temporary file for writing at path: " + info.path);
            }

            self._tts.synthesize(utterance)
                .pipe(fs.createWriteStream(info.path))
                .on('close', function() {
                    if (self.config.verboseLogging) {
                        console.info("> wrote audio stream to temp file [" + info.path + "]");
                        console.info("> TJBot says: " + message);
                    }
                    resolve(self.playSound(info.path));
                });
        });
    });
}

/**
 * Play a given sound file.
 *
 * @param {String} soundFile The sound file to be played .
 */

TJBot.prototype.playSound = function(soundFile) {

    // capture context
    var self = this;

    // allow only single access to this function
    if (!self._isPlaying) {
        self._isPlaying = true;
        self.pauseListening();
        return new Promise(function(resolve, reject) {
            // play the audio
            var player = new APlay();

            player.on('complete', function() {
                if (self.config.verboseLogging) {
                    console.info("> audio playback finished");
                }
                self._isPlaying = false;
                self.resumeListening();
                resolve(soundFile);
            });

            player.on('error', function() {
                if (self.config.verboseLogging) {
                    console.error("> an audio playback error has occurred");
                }
                reject();
            });
            player.play(soundFile);
        });
    } else {
        if (self.config.verboseLogging) console.log("> Speaker in use, try playing audio later.");
    };

}

/**
 * Listen for spoken utterances.
 */
TJBot.prototype.listen = function(callback) {
    // make sure we can listen
    this._assertCapability('listen');

    // set up the microphone
    this._sendAudioWatsonSpeechtoText(callback);
}


/**
 * Pause listening for spoken utterances
 */
TJBot.prototype.pauseListening = function() {
    // make sure we can listen
    //this._assertCapability('listen');

    if (this.config.verboseLogging) {
        console.error("> pause listening requested");
    }

    // stop the mic
    if (this._mic) this._mic.pause();

}


/**
 * Resume listening for spoken utterances
 */
TJBot.prototype.resumeListening = function() {
    // make sure we can listen
    //this._assertCapability('listen');

    // resume the mic
    if (this._mic) this._mic.resume();
}

/**
 * Stop listening for spoken utterances
 */
TJBot.prototype.stopListening = function() {
    // make sure we can listen
    this._assertCapability('listen');

    if (this.config.verboseLogging) {
        console.error("> stop listening requested");
    }

    // stop the mic
    this._mic.stop();
}

/**
 * Raise TJ's arm.
 */
TJBot.prototype._SERVO_ARM_UP = 500;
TJBot.prototype._SERVO_ARM_MID = 1900;
TJBot.prototype._SERVO_ARM_DOWN = 2300;

TJBot.prototype.raiseArm = function() {
    // make sure we have an arm
    this._assertCapability('wave');
    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_UP);
    return true;
}

/**
 * Lower TJ's arm.
 */
TJBot.prototype.lowerArm = function() {
    this._assertCapability('wave');
    this._motor.servoWrite(TJBot.prototype._SERVO_ARM_DOWN);
}

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
}

/**
 * Analyze the tone of a given text.
 *
 * @param {String} text The text to analyze.
 */
TJBot.prototype.analyzeTone = function(text) {
    this._assertCapability('tone');

    var self = this;
    return new Promise(function(resolve, reject) {
        var params = {
            text: text
        };

        self._toneAnalyzer.tone(params, function(err, tone) {
            if (err) {
                console.error("The tone_analyzer service returned an error. This may indicate you have exceeded your usage quota for the service.");
                console.error("Raw error:");
                console.error(JSON.stringify(err));
            } else {
                resolve(tone);
            }
        });
    });
}


/**
 * Export TJBot!
 */
module.exports = TJBot;
