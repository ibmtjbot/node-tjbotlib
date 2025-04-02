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
import TOML from '@iarna/toml';
import temp from 'temp';
import { Transform } from 'stream';
import libcamera from 'libcamera';
import { PiCameraOutput } from 'libcamera/dist/types';
import Mic from 'mic';
import RecognizeStream from 'ibm-watson/lib/recognize-stream';
import SoundPlayer from 'sound-player';
import { once } from 'events';

import { Capability, Hardware, ServoPosition } from "./constants";
import { mic } from './@types/mic';
import { soundplayer } from './@types/sound-player';
import { convertHexToRgbColor } from './utils';

export abstract class RPiHardwareDriver {
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;

    abstract setupCamera(config: TOML.AnyJson): void;
    abstract setupLEDCommonAnode(config: TOML.AnyJson): void;
    abstract setupLEDNeopixel(config: TOML.AnyJson): void;
    abstract setupMicrophone(config: TOML.AnyJson): void;
    abstract setupServo(config: TOML.AnyJson): void;
    abstract setupSpeaker(config: TOML.AnyJson): void;

    // LISTEN
    abstract connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream;
    abstract startMic(): void;
    abstract pauseMic(): void;
    abstract resumeMic(): void;
    abstract stopMic(): void;

    // SEE
    abstract capturePhoto(atPath?: string): Promise<string>;

    // SHINE
    abstract renderLED(hexColor: string): void;
    abstract renderLEDCommonAnode(rgbColor: [number, number, number]): void;
    abstract renderLEDNeopixel(hexColor: string): void;

    // SPEAK
    abstract playAudio(audioPath: string): Promise<void>;

    // WAVE
    abstract renderServoPosition(position: ServoPosition): void;
}

export abstract class RPiBaseHardwareDriver extends RPiHardwareDriver {
    // initialized hardware
    initializedHardware: Set<Hardware>;

    // camera
    camera?: PiCameraOutput;
    cameraResolution: [number, number];
    cameraVerticalFlip: boolean;
    cameraHorizontalFlip: boolean;

    // microphone
    mic: mic.Mic;
    micInputStream: Transform;

    // speaker
    soundplayer: soundplayer.SoundPlayer;
    speakerDevice: string;

    constructor() {
        super();
        this.initializedHardware = new Set();
        this.soundplayer = SoundPlayer;
    }

    hasHardware(hardware: Hardware): boolean {
        return this.initializedHardware.has(hardware);
    }

    hasCapability(capability: Capability): boolean {
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

    setupCamera(config: TOML.AnyJson): void {
        this.camera = libcamera;
        this.cameraResolution = config['cameraResolution'];
        this.cameraVerticalFlip = config['verticalFlip'];
        this.cameraHorizontalFlip = config['horizontalFlip'];
        this.initializedHardware.add(Hardware.CAMERA);
    }

    setupMicrophone(config: TOML.AnyJson) {
        winston.verbose(`🎤 initializing ${Hardware.MICROPHONE}`);

        const params = {
            rate: config['microphoneRate'],
            channels: config['microphoneChannels'],
            debug: false,
            exitOnSilence: 6,
        };

        const device = config['device'] ?? '';
        if (device != '') {
            winston.verbose('🎤 listening through user-defined audio device: ' + device);
            params['device'] = device;
        } else {
            winston.verbose('🎤 listening through default audio device');
        }

        // create the microphone
        this.mic = Mic(params);

        // save the input stream so we can pipe it to STT
        // the weird typecasting is because we're using super legacy js code :)
        this.micInputStream = ((this.mic.getAudioStream() as unknown) as Transform);

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

    setupSpeaker(config: TOML.AnyJson): void {
        this.speakerDevice = config['device'] ?? '';
        winston.verbose(`🔈 initializing ${Hardware.SPEAKER} on device ${this.speakerDevice}`);
        this.soundplayer = SoundPlayer;

        this.initializedHardware.add(Hardware.SPEAKER);
    }

    connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream {
        return this.micInputStream.pipe(sttStream);
    }

    startMic(): void {
        if (this.mic !== undefined) {
            this.mic.start();
        }
    }

    pauseMic(): void {
        if (this.mic !== undefined) {
            winston.verbose('🎤 listening paused');
            this.mic.pause();
        }
    }

    resumeMic(): void {
        if (this.mic !== undefined) {
            winston.verbose('🎤 listening resumed');
            this.mic.resume();
        }
    }

    stopMic(): void {
        if (this.mic !== undefined) {
            this.mic.stop();
        }
    }

    async capturePhoto(atPath?: string): Promise<string> {
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
        }

        winston.verbose(`📷 capturing image at path: ${atPath}`);
        winston.debug(`📷 camera options: ${JSON.stringify(cameraConfig)}`);

        await this.camera.jpeg({
            config: cameraConfig
        });

        return new Promise((resolve) => {
            resolve(atPath);
        });
    }

    renderLED(hexColor: string): void {
        if (this.hasHardware(Hardware.LED_COMMON_ANODE)) {
            const rgb: [number, number, number] = convertHexToRgbColor(hexColor);
            this.renderLEDCommonAnode(rgb);
        }
        if (this.hasHardware(Hardware.LED_NEOPIXEL)) {
            this.renderLEDNeopixel(hexColor);
        }
    }

    async playAudio(audioPath: string, device?: string): Promise<void> {
        // pause listening while we play a sound -- using the internal
        // method to avoid a capability check (and potential fail if the TJBot
        // isn't configured to listen)
        this.pauseMic();

        // if we don't have a speaker, throw an error
        if (this.soundplayer === undefined) {
            throw new Error(`unable to play audio, ${Hardware.SPEAKER} not initialized`);
        }

        // initialize soundplayer lib
        const params = {
            filename: audioPath,
            gain: 100,
            debug: true,
            player: 'aplay'
        };

        if (device !== undefined) {
            winston.verbose('🔈 playing through user-defined audio device: ' + device);
            params['device'] = device;
        } else {
            winston.verbose('🔈 playing through default audio device');
        }

        const player = new this.soundplayer(params);

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
