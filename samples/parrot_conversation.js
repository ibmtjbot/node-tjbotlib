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

var tjbot = require('../lib/tjbot');
var constants = require('./config');

// these are the hardware capabilities that TJ needs for this recipe
var hardware = ['microphone', 'speaker'];

// obtain our credentials from config.js
var credentials = constants.credentials;

// turn on debug logging to the console
var config = {
    verboseLogging: true,
    voice: {
        "gender": "female",
        "language": "en-BR"
    }
};
// obtain our configs from config.js and merge with custom configs
config = Object.assign(constants.config, config);

// obtain user-specific config
var WORKSPACEID = config.conversationWorkspaceId;

// instantiate our TJBot!
var tj = new tjbot(hardware, config, credentials);

// listen for utterances with our attentionWord and send the result to
// the Conversation service
//tj.speak("Welcome");
tj.listen(function(msg) {
    tj.speak(msg);
});
