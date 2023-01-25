/* eslint-disable no-undef */
/**
 * Copyright 2016-2020 IBM Corp. All Rights Reserved.
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

// import { config } from 'bluebird';
import TJBot from '../src/tjbot.js';
import config from './config.js';

test('instantiate TJBot with Tone Analyzer/NLU', async () => {
    const tjbot = new TJBot({}, 'ibm-credentials.env');
    tjbot.initialize([]);
    let tone = await tjbot.analyzeTone("I am so happy to see you! Thank you for being here!");
    console.log("targets: ", tone.emotion.targets);
    console.log("document: ", tone.emotion.document);
    const tones = [];
    Object.keys(tone.emotion.document.emotion).forEach(key => {
        let value = tone.emotion.document.emotion[key];
        tones.push({tone_id: key, score: value});
    })
    const emotionalTones = tones.filter((t) => t.tone_id === 'anger' || t.tone_id === 'fear' || t.tone_id === 'joy' || t.tone_id === 'sadness');
        if (emotionalTones.length > 0) {
            const maxTone = emotionalTones.reduce((a, b) => ((a.score > b.score) ? a : b));
            expect(maxTone.tone_id).toBe('joy');
        }
});

test('instantiate TJBot', () => {
    const tjbot = new TJBot();
    expect(tjbot).toBeDefined();
});

test('instantiate TJBot with configuration', () => {
    const tjbot = new TJBot({
        log: { level: 'silly' },
        robot: { gender: TJBot.GENDERS.FEMALE },
    });
    expect(tjbot.configuration.log.level).toEqual('silly');
    expect(tjbot.configuration.robot.gender).toEqual('female');
});

test('instantiate TJBot with credentials file', () => {
    // eslint-disable-next-line no-unused-vars
    const tjbot = new TJBot({}, 'ibm-credentials.env');
    expect(process.env.IBM_CREDENTIALS_FILE).toEqual('ibm-credentials.env');
});

test('instantiate TJBot with Assistant', async () => {
    const tjbot = new TJBot({
        log: { level: 'info' },
        converse: { assistantId: config.assistantId }
    }, 'ibm-credentials.env');
    tjbot.initialize([]);
    let data = await tjbot.converse("hello");
    expect(data.description).toBe("Hello");
});

test('instantiate TJBot with no hardware', () => {
    const tjbot = new TJBot();
    tjbot.initialize([]);
    expect(tjbot).toBeDefined();
});

test('instantiate TJBot with all hardware', () => {
    const tjbot = new TJBot();
    tjbot.initialize(Object.keys(TJBot.HARDWARE));
    expect(tjbot).toBeDefined();
});