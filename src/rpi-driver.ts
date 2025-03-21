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
import libcamera from 'libcamera';
import { PiCameraOutput } from 'libcamera/dist/types';
import Mic from 'mic';
import SoundPlayer from 'sound-player';

import { Capability, Hardware, ServoPosition } from "./constants";

export abstract class RPiHardwareDriver {
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;

    abstract setupCamera(config: TOML.AnyJson): void;
    abstract setupLEDCommonAnode(config: TOML.AnyJson): void;
    abstract setupLEDNeopixel(config: TOML.AnyJson): void;
    abstract setupMicrophone(config: TOML.AnyJson): void;
    abstract setupServo(config: TOML.AnyJson): void;
    abstract setupSpeaker(config: TOML.AnyJson): void;

    abstract renderCommonAnodeLED(rgbColor: [number, number, number]): void;
    abstract renderNeopixelLed(hexColor: string): void;
    abstract renderServoPosition(position: ServoPosition): void;
}

export abstract class RPiBaseHardwareDriver extends RPiHardwareDriver {
    // initialized hardware
    initializedHardware: Set<Hardware>;

    // camera
    camera: PiCameraOutput;
    cameraResolution: [number, number];
    cameraVerticalFlip: boolean;
    cameraHorizontalFlip: boolean;

    // microphone
    mic: Mic;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    micInputStream: any;

    // speaker
    soundplayer: SoundPlayer;
    speakerDevice: string;

    constructor() {
        super();
        this.initializedHardware = new Set();
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

    setupSpeaker(config: TOML.AnyJson): void {
        this.speakerDevice = config['device'] ?? '';
        winston.verbose(`🔈 initializing ${Hardware.SPEAKER} on device ${this.speakerDevice}`);
        this.soundplayer = SoundPlayer;

        this.initializedHardware.add(Hardware.SPEAKER);
    }
}
