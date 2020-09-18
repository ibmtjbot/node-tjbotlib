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

// import rl from 'readline-sync';
import TJBot from '../lib/tjbot';

test('tjbot shining red', () => {
    const tjbot = new TJBot({ log: { level: 'silly' } });
    tjbot.initialize([TJBot.HARDWARE.LED]);
    tjbot.shine('red');

    // const answer = rl.question('Did the light shine red (y/n)? ');
    // expect(answer.toLowerCase()).toEqual('y');
});

test('tjbot shining green', () => {
    const tjbot = new TJBot({ log: { level: 'silly' } });
    tjbot.initialize([TJBot.HARDWARE.LED]);
    tjbot.shine('green');

    // const answer = rl.question('Did the light shine green (y/n)? ');
    // expect(answer.toLowerCase()).toEqual('y');
});

test('tjbot shining blue', () => {
    const tjbot = new TJBot({ log: { level: 'silly' } });
    tjbot.initialize([TJBot.HARDWARE.LED]);
    tjbot.shine('blue');

    // const answer = rl.question('Did the light shine blue (y/n)? ');
    // expect(answer.toLowerCase()).toEqual('y');
});

test('tjbot pulsing red', async () => {
    const tjbot = new TJBot({ log: { level: 'silly' } });
    tjbot.initialize([TJBot.HARDWARE.LED]);
    await tjbot.pulse('red');

    // const answer = rl.question('Did the light pulse red (y/n)? ');
    // expect(answer.toLowerCase()).toEqual('y');
});
