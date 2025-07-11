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
import { JsonArray, JsonMap } from '@iarna/toml';
import temp from 'temp';
import { Transform } from 'stream';
import libcamera from 'libcamera';
import { PiCameraOutput } from 'libcamera/dist/types';
import Mic from 'mic';
import RecognizeStream from 'ibm-watson/lib/recognize-stream';
import SoundPlayer from 'sound-player';
import { once } from 'events';

import { Capability, Hardware, ServoPosition } from "./constants";

import { convertHexToRgbColor } from './utils';

export abstract class RPiHardwareDriver {
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;

    abstract setupCamera(config: JsonMap): void;
    abstract setupLEDCommonAnode(config: JsonMap): void;
    abstract setupLEDNeopixel(config: JsonMap): void;
    abstract setupMicrophone(config: JsonMap): void;
    abstract setupServo(config: JsonMap): void;
    abstract setupSpeaker(config: JsonMap): void;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mic: any;
    micInputStream: Transform;

    // speaker
    speakerDevice: string;

    constructor() {
        super();
        this.initializedHardware = new Set();
        this.cameraResolution = [1920, 1080];
        this.cameraVerticalFlip = false;
        this.cameraHorizontalFlip = false;
        const params = {};
        this.mic = Mic(params);
        this.micInputStream = ((this.mic.getAudioStream() as unknown) as Transform);
        this.speakerDevice = '';
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

    setupCamera(config: JsonMap): void {
        this.camera = libcamera;
        const width = (config['cameraResolution'] as JsonArray)[0] as number;
        const height = (config['cameraResolution'] as JsonArray)[1] as number;
        this.cameraResolution = [width, height];
        this.cameraVerticalFlip = config['verticalFlip'] as boolean;
        this.cameraHorizontalFlip = config['horizontalFlip'] as boolean;
        this.initializedHardware.add(Hardware.CAMERA);
    }

    setupMicrophone(config: JsonMap) {
        winston.verbose(`🎤 initializing ${Hardware.MICROPHONE}`);

        const params = {
            device: '',
            rate: config['microphoneRate'] as number,
            channels: config['microphoneChannels'] as number,
            debug: false,
            exitOnSilence: 6,
        };

        const device = (config['device'] as string) ?? '';
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

    setupSpeaker(config: JsonMap): void {
        this.speakerDevice = (config['device'] as string) ?? '';
        winston.verbose(`🔈 initializing ${Hardware.SPEAKER} on device ${this.speakerDevice}`);

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

        if (this.camera) {
            await this.camera.jpeg({
                config: cameraConfig
            });
        } else {
            winston.error('📷 camera is not initialized');
        }

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
        } else {
            winston.verbose('🔈 playing through default audio device');
        }

        const player: SoundPlayer = new SoundPlayer(params);

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
