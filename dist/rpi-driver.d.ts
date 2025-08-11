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
import { JsonMap } from '@iarna/toml';
import { Transform } from 'stream';
import { PiCameraOutput } from 'libcamera/dist/types';
import RecognizeStream from 'ibm-watson/lib/recognize-stream';
import { Capability, Hardware, ServoPosition } from "./constants.js";
export declare abstract class RPiHardwareDriver {
    abstract hasHardware(hardware: Hardware): boolean;
    abstract hasCapability(capability: Capability): boolean;
    abstract setupCamera(config: JsonMap): void;
    abstract setupLEDCommonAnode(config: JsonMap): void;
    abstract setupLEDNeopixel(config: JsonMap): void;
    abstract setupMicrophone(config: JsonMap): void;
    abstract setupServo(config: JsonMap): void;
    abstract setupSpeaker(config: JsonMap): void;
    abstract connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream;
    abstract startMic(): void;
    abstract pauseMic(): void;
    abstract resumeMic(): void;
    abstract stopMic(): void;
    abstract capturePhoto(atPath?: string): Promise<string>;
    abstract renderLED(hexColor: string): void;
    abstract renderLEDCommonAnode(rgbColor: [number, number, number]): void;
    abstract renderLEDNeopixel(hexColor: string): void;
    abstract playAudio(audioPath: string): Promise<void>;
    abstract renderServoPosition(position: ServoPosition): void;
}
export declare abstract class RPiBaseHardwareDriver extends RPiHardwareDriver {
    initializedHardware: Set<Hardware>;
    camera?: PiCameraOutput;
    cameraResolution: [number, number];
    cameraVerticalFlip: boolean;
    cameraHorizontalFlip: boolean;
    mic: any;
    micInputStream: Transform;
    speakerDevice: string;
    constructor();
    hasHardware(hardware: Hardware): boolean;
    hasCapability(capability: Capability): boolean;
    setupCamera(config: JsonMap): void;
    setupMicrophone(config: JsonMap): void;
    setupSpeaker(config: JsonMap): void;
    connectMicStreamToSTTStream(sttStream: RecognizeStream): RecognizeStream;
    startMic(): void;
    pauseMic(): void;
    resumeMic(): void;
    stopMic(): void;
    capturePhoto(atPath?: string): Promise<string>;
    renderLED(hexColor: string): void;
    playAudio(audioPath: string, device?: string): Promise<void>;
}
