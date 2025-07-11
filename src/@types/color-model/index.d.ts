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

declare module 'color-model' {
    export class Component {
        constructor(...args: unknown[]);
    }
    export class AbstractModel {
        constructor(...args: unknown[]);
        toHsl(): Hsl;
        // Add other common methods here
    }
    export class Xyz extends AbstractModel { }
    export class Rgb extends AbstractModel {
        constructor(rgb: string | number[]);
        toHexString(): string;
    }
    export class HexRgb extends AbstractModel {
        constructor(hex: string);
        toHsl(): Hsl;
    }
    export class Lab extends AbstractModel { }
    export class Hsl extends AbstractModel {
        lightness(value: number): Hsl;
        toRgb(): Rgb;
    }
}
