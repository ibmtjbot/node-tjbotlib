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
var hardware = ['microphone'];

// turn on debug logging to the console
var tjConfig = {
    log: {
        level: 'silly'
    }
};

// instantiate our TJBot!
var tj = new TJBot(hardware, tjConfig, credentials);

// listen for speech
function doListen() {
    console.log("calling listen()");
    tj.listen(function(msg) {
        if (msg.startsWith("stop")) {
            console.log("stopping listening");
            tj.stopListening();
            console.log("calling doListen() again");
            doListen();
            console.log("after doListen() call");
        } else if (msg.startsWith("exit")) {
            console.log("exiting test");
            process.exit();
        }
    });
    console.log("after listen() call");
}

doListen();
