/**
 * Copyright 2024 IBM Corp. All Rights Reserved.
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

import fs from 'fs';

class RPiDetect {
    static model(): string {
        let cpuInfo = "";

        try {
            cpuInfo = fs.readFileSync('/proc/cpuinfo', { encoding: 'utf8' });
        } catch {
            // likely not a Pi if we can't open /proc/cpuinfo
            return "";
        }

        const modelLine = cpuInfo.split('\n').find((line) => 
            line.startsWith("Model")
        );
        if (modelLine === undefined) {
            return "";
        }

        const model = modelLine.split(':')[1].trim();
        return model;
    }

    static isPi3(): boolean {
        const model = RPiDetect.model();
        return model.startsWith("Raspberry Pi 3");
    }

    static isPi4(): boolean {
        const model = RPiDetect.model();
        return model.startsWith("Raspberry Pi 4");
    }

    static isPi5(): boolean {
        const model = RPiDetect.model();
        return model.startsWith("Raspberry Pi 5");
    }
}

export default RPiDetect;
