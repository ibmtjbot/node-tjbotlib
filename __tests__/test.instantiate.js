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

import TJBot from '../lib/tjbot';

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
    const tjbot = new TJBot({}, 'credentials.env');
    expect(process.env.IBM_CREDENTIALS_FILE).toEqual('credentials.env');
});

test('instantiate TJBot with no hardware', () => {
    const tjbot = new TJBot();
    tjbot.initialize();
    expect(tjbot).toBeDefined();
});

test('instantiate TJBot with all hardware', () => {
    const tjbot = new TJBot();
    tjbot.initialize(Object.keys(TJBot.HARDWARE));
    expect(tjbot).toBeDefined();
});
