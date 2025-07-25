"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPiBaseHardwareDriver = exports.RPiHardwareDriver = void 0;
const winston_1 = __importDefault(require("winston"));
const temp_1 = __importDefault(require("temp"));
const libcamera_1 = __importDefault(require("libcamera"));
const mic_1 = __importDefault(require("mic"));
const sound_player_1 = __importDefault(require("sound-player"));
const events_1 = require("events");
const constants_1 = require("./constants");
const utils_1 = require("./utils");
class RPiHardwareDriver {
}
exports.RPiHardwareDriver = RPiHardwareDriver;
class RPiBaseHardwareDriver extends RPiHardwareDriver {
    // initialized hardware
    initializedHardware;
    // camera
    camera;
    cameraResolution;
    cameraVerticalFlip;
    cameraHorizontalFlip;
    // microphone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mic;
    micInputStream;
    // speaker
    speakerDevice;
    constructor() {
        super();
        this.initializedHardware = new Set();
        this.cameraResolution = [1920, 1080];
        this.cameraVerticalFlip = false;
        this.cameraHorizontalFlip = false;
        const params = {};
        this.mic = (0, mic_1.default)(params);
        this.micInputStream = this.mic.getAudioStream();
        this.speakerDevice = '';
    }
    hasHardware(hardware) {
        return this.initializedHardware.has(hardware);
    }
    hasCapability(capability) {
        switch (capability) {
            case constants_1.Capability.LISTEN:
                return this.hasHardware(constants_1.Hardware.MICROPHONE);
            case constants_1.Capability.LOOK:
                return this.hasHardware(constants_1.Hardware.CAMERA);
            case constants_1.Capability.SHINE:
                return this.hasHardware(constants_1.Hardware.LED_COMMON_ANODE) || this.hasHardware(constants_1.Hardware.LED_NEOPIXEL);
            case constants_1.Capability.SPEAK:
                return this.hasHardware(constants_1.Hardware.SPEAKER);
            case constants_1.Capability.WAVE:
                return this.hasHardware(constants_1.Hardware.SERVO);
            default:
                return false;
        }
    }
    setupCamera(config) {
        this.camera = libcamera_1.default;
        const width = config['cameraResolution'][0];
        const height = config['cameraResolution'][1];
        this.cameraResolution = [width, height];
        this.cameraVerticalFlip = config['verticalFlip'];
        this.cameraHorizontalFlip = config['horizontalFlip'];
        this.initializedHardware.add(constants_1.Hardware.CAMERA);
    }
    setupMicrophone(config) {
        winston_1.default.verbose(`🎤 initializing ${constants_1.Hardware.MICROPHONE}`);
        const params = {
            device: '',
            rate: config['microphoneRate'],
            channels: config['microphoneChannels'],
            debug: false,
            exitOnSilence: 6,
        };
        const device = config['device'] ?? '';
        if (device != '') {
            winston_1.default.verbose('🎤 listening through user-defined audio device: ' + device);
            params['device'] = device;
        }
        else {
            winston_1.default.verbose('🎤 listening through default audio device');
        }
        // create the microphone
        this.mic = (0, mic_1.default)(params);
        // save the input stream so we can pipe it to STT
        // the weird typecasting is because we're using super legacy js code :)
        this.micInputStream = this.mic.getAudioStream();
        // event handlers
        this.micInputStream.on('startComplete', () => {
            winston_1.default.verbose('🎤 microphone started');
        });
        this.micInputStream.on('pauseComplete', () => {
            winston_1.default.verbose('🎤 microphone paused');
        });
        this.micInputStream.on('data', () => {
            // turn this on for serious debugging, otherwise it's very noisy :)
            // winston.verbose('🎤 microphone received data: ' + data.length + ' bytes');
        });
        // log errors in the mic input stream
        this.micInputStream.on('error', (err) => {
            winston_1.default.error('🎤 microphone input stream experienced an error', err);
        });
        this.micInputStream.on('processExitComplete', () => {
            winston_1.default.verbose('🎤 microphone recording process exited');
        });
        // ignore silence
        this.micInputStream.on('silence', () => {
            winston_1.default.verbose('🎤 microphone silence');
        });
        this.initializedHardware.add(constants_1.Hardware.MICROPHONE);
    }
    setupSpeaker(config) {
        this.speakerDevice = config['device'] ?? '';
        winston_1.default.verbose(`🔈 initializing ${constants_1.Hardware.SPEAKER} on device ${this.speakerDevice}`);
        this.initializedHardware.add(constants_1.Hardware.SPEAKER);
    }
    connectMicStreamToSTTStream(sttStream) {
        return this.micInputStream.pipe(sttStream);
    }
    startMic() {
        if (this.mic !== undefined) {
            this.mic.start();
        }
    }
    pauseMic() {
        if (this.mic !== undefined) {
            winston_1.default.verbose('🎤 listening paused');
            this.mic.pause();
        }
    }
    resumeMic() {
        if (this.mic !== undefined) {
            winston_1.default.verbose('🎤 listening resumed');
            this.mic.resume();
        }
    }
    stopMic() {
        if (this.mic !== undefined) {
            this.mic.stop();
        }
    }
    async capturePhoto(atPath) {
        if (atPath === undefined) {
            atPath = temp_1.default.path({
                prefix: 'tjbot',
                suffix: '.jpg',
            });
        }
        // set the configuration options
        const cameraConfig = {
            output: atPath,
            nopreview: true,
            hflip: this.cameraHorizontalFlip,
            vflip: this.cameraVerticalFlip,
            width: this.cameraResolution[0],
            height: this.cameraResolution[1],
        };
        winston_1.default.verbose(`📷 capturing image at path: ${atPath}`);
        winston_1.default.debug(`📷 camera options: ${JSON.stringify(cameraConfig)}`);
        if (this.camera) {
            await this.camera.jpeg({
                config: cameraConfig
            });
        }
        else {
            winston_1.default.error('📷 camera is not initialized');
        }
        return new Promise((resolve) => {
            resolve(atPath);
        });
    }
    renderLED(hexColor) {
        if (this.hasHardware(constants_1.Hardware.LED_COMMON_ANODE)) {
            const rgb = (0, utils_1.convertHexToRgbColor)(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.hasHardware(constants_1.Hardware.LED_NEOPIXEL)) {
            this.renderLEDNeopixel(hexColor);
        }
    }
    async playAudio(audioPath, device) {
        // pause listening while we play a sound -- using the internal
        // method to avoid a capability check (and potential fail if the TJBot
        // isn't configured to listen)
        this.pauseMic();
        // initialize soundplayer lib
        const params = {
            device: '',
            filename: audioPath,
            gain: 100,
            debug: true,
            player: 'aplay'
        };
        if (device !== undefined) {
            winston_1.default.verbose('🔈 playing through user-defined audio device: ' + device);
            params['device'] = device;
        }
        else {
            winston_1.default.verbose('🔈 playing through default audio device');
        }
        const player = new sound_player_1.default(params);
        winston_1.default.debug('🔈 playing audio with parameters: ', params);
        // capture 'this' context so we can reference it in the callback
        player.on('complete', () => {
            winston_1.default.debug('🔈 audio playback finished');
            // resume listening
            this.resumeMic();
        });
        player.on('error', (err) => {
            winston_1.default.error('error occurred while playing audio', err);
        });
        // play the audio
        player.play(audioPath);
        // wait for the audio to finish playing, either by completing playback or by throwing an error
        await Promise.race([
            (0, events_1.once)(player, 'complete'),
            (0, events_1.once)(player, 'error')
        ]);
    }
}
exports.RPiBaseHardwareDriver = RPiBaseHardwareDriver;
