'use strict';
var expect = require('chai').expect;
var tjbot = require('../lib/tjbot')
var tj = new tjbot(['speaker', 'microphone'], {}, {});


describe('#tjbot SPEAKER', function() {
    it('should play a wave sound', function() {
        var soundFile = "/usr/share/sounds/alsa/Front_Center.wav";
        var result = tj.playSound(soundFile).then(function(result) {
            expect(result).equal(soundFile);
        });
    });
});

// var endTime = new Date();
// console.log("time to shine led ", startTime, endTime, (startTime - endTime) / 1000)

/**
 * Copyright 2016 IBM Corp. All Rights Reserved.
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

'use strict';

const chai = require('chai');
chai.config.includeStack = true;

const readline = require('readline');

const TJBot = require('../lib/tjbot');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var tj = new TJBot(['speaker'], {}, {});

describe('#tjbot SPEAKER', function() {
    it('should play a sound', function() {
        var sound = '/usr/share/sounds/alsa/Front_Center.wav';
        tj.play(sound).then(function() {
            rl.question('Did you hear the sound play? Y/N', (answer) => {
                expect(answer.toLowerCase()).to.be.equal('y');
            });
        });
    });
});

rl.close();
