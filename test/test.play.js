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

const TJBot = require('../lib/tjbot');
const config = require('./config');

var credentials = config.credentials;
var hardware = ['speaker'];

// turn on debug logging to the console
var tjConfig = {
    log: {
        level: 'silly'
    }
};

// instantiate our TJBot!
var tj = new TJBot(hardware, tjConfig, credentials);

// play a sound file
var sound = "/usr/share/sounds/alsa/Front_Center.wav";

console.log("playing sound");
tj.play(sound).then(function() {
    console.log("sound should have played");
});
