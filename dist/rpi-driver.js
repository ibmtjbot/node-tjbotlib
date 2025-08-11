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
import winston from 'winston';
import temp from 'temp';
import libcamera from 'libcamera';
import Mic from 'mic';
import SoundPlayer from 'sound-player';
import { once } from 'events';
import { Capability, Hardware } from "./constants";
import { convertHexToRgbColor } from './utils';
export class RPiHardwareDriver {
}
export class RPiBaseHardwareDriver extends RPiHardwareDriver {
    constructor() {
        super();
        this.initializedHardware = new Set();
        this.cameraResolution = [1920, 1080];
        this.cameraVerticalFlip = false;
        this.cameraHorizontalFlip = false;
        const params = {};
        this.mic = Mic(params);
        this.micInputStream = this.mic.getAudioStream();
        this.speakerDevice = '';
    }
    hasHardware(hardware) {
        return this.initializedHardware.has(hardware);
    }
    hasCapability(capability) {
        switch (capability) {
            case Capability.LISTEN:
                return this.hasHardware(Hardware.MICROPHONE);
            case Capability.LOOK:
                return this.hasHardware(Hardware.CAMERA);
            case Capability.SHINE:
                return this.hasHardware(Hardware.LED_COMMON_ANODE) || this.hasHardware(Hardware.LED_NEOPIXEL);
            case Capability.SPEAK:
                return this.hasHardware(Hardware.SPEAKER);
            case Capability.WAVE:
                return this.hasHardware(Hardware.SERVO);
            default:
                return false;
        }
    }
    setupCamera(config) {
        this.camera = libcamera;
        const width = config['cameraResolution'][0];
        const height = config['cameraResolution'][1];
        this.cameraResolution = [width, height];
        this.cameraVerticalFlip = config['verticalFlip'];
        this.cameraHorizontalFlip = config['horizontalFlip'];
        this.initializedHardware.add(Hardware.CAMERA);
    }
    setupMicrophone(config) {
        winston.verbose(`🎤 initializing ${Hardware.MICROPHONE}`);
        const params = {
            device: '',
            rate: config['microphoneRate'],
            channels: config['microphoneChannels'],
            debug: false,
            exitOnSilence: 6,
        };
        const device = config['device'] ?? '';
        if (device != '') {
            winston.verbose('🎤 listening through user-defined audio device: ' + device);
            params['device'] = device;
        }
        else {
            winston.verbose('🎤 listening through default audio device');
        }
        // create the microphone
        this.mic = Mic(params);
        // save the input stream so we can pipe it to STT
        // the weird typecasting is because we're using super legacy js code :)
        this.micInputStream = this.mic.getAudioStream();
        // event handlers
        this.micInputStream.on('startComplete', () => {
            winston.verbose('🎤 microphone started');
        });
        this.micInputStream.on('pauseComplete', () => {
            winston.verbose('🎤 microphone paused');
        });
        this.micInputStream.on('data', () => {
            // turn this on for serious debugging, otherwise it's very noisy :)
            // winston.verbose('🎤 microphone received data: ' + data.length + ' bytes');
        });
        // log errors in the mic input stream
        this.micInputStream.on('error', (err) => {
            winston.error('🎤 microphone input stream experienced an error', err);
        });
        this.micInputStream.on('processExitComplete', () => {
            winston.verbose('🎤 microphone recording process exited');
        });
        // ignore silence
        this.micInputStream.on('silence', () => {
            winston.verbose('🎤 microphone silence');
        });
        this.initializedHardware.add(Hardware.MICROPHONE);
    }
    setupSpeaker(config) {
        this.speakerDevice = config['device'] ?? '';
        winston.verbose(`🔈 initializing ${Hardware.SPEAKER} on device ${this.speakerDevice}`);
        this.initializedHardware.add(Hardware.SPEAKER);
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
            winston.verbose('🎤 listening paused');
            this.mic.pause();
        }
    }
    resumeMic() {
        if (this.mic !== undefined) {
            winston.verbose('🎤 listening resumed');
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
            atPath = temp.path({
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
        winston.verbose(`📷 capturing image at path: ${atPath}`);
        winston.debug(`📷 camera options: ${JSON.stringify(cameraConfig)}`);
        if (this.camera) {
            await this.camera.jpeg({
                config: cameraConfig
            });
        }
        else {
            winston.error('📷 camera is not initialized');
        }
        return new Promise((resolve) => {
            resolve(atPath);
        });
    }
    renderLED(hexColor) {
        if (this.hasHardware(Hardware.LED_COMMON_ANODE)) {
            const rgb = convertHexToRgbColor(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.hasHardware(Hardware.LED_NEOPIXEL)) {
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
            winston.verbose('🔈 playing through user-defined audio device: ' + device);
            params['device'] = device;
        }
        else {
            winston.verbose('🔈 playing through default audio device');
        }
        const player = new SoundPlayer(params);
        winston.debug('🔈 playing audio with parameters: ', params);
        // capture 'this' context so we can reference it in the callback
        player.on('complete', () => {
            winston.debug('🔈 audio playback finished');
            // resume listening
            this.resumeMic();
        });
        player.on('error', (err) => {
            winston.error('error occurred while playing audio', err);
        });
        // play the audio
        player.play(audioPath);
        // wait for the audio to finish playing, either by completing playback or by throwing an error
        await Promise.race([
            once(player, 'complete'),
            once(player, 'error')
        ]);
    }
}
//# sourceMappingURL=rpi-driver.js.map