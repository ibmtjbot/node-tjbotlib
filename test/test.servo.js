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

var tj = new TJBot(['servo'], {}, {});

describe('#tjbot SERVO BACK', function() {
    it('should move the arm to the backward position', function() {
        tj.armBack();
        rl.question('Is TJBot\'s arm in the BACK position? Y/N', (answer) => {
            expect(answer.toLowerCase()).to.be.equal('y');
        });
    });
});

describe('#tjbot SERVO UP', function() {
    it('should move the arm to the raised position', function() {
        tj.raiseArm();
        rl.question('Is TJBot\'s arm in the RAIDED position? Y/N', (answer) => {
            expect(answer.toLowerCase()).to.be.equal('y');
        });
    });
});

describe('#tjbot SERVO DOWN', function() {
    it('should move the arm to the lowered position', function() {
        tj.lowerArm();
        rl.question('Is TJBot\'s arm in the LOWERED position? Y/N', (answer) => {
            expect(answer.toLowerCase()).to.be.equal('y');
        });
    });
});

describe('#tjbot SERVO WAVE', function() {
    it('should wave', function() {
        tj.wave();
        rl.question('Did TJBot wave? Y/N', (answer) => {
            expect(answer.toLowerCase()).to.be.equal('y');
        });
    });
});

rl.close();
