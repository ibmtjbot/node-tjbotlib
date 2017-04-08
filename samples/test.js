var tjbot = require('../lib/tjbot');
var config = require('./config');

// obtain our credentials from config.js
var credentials = config.credentials;

// obtain user-specific config
//var VOICE = constants.config.voice;
var WORKSPACEID = config.conversationWorkspaceId;

// these are the hardware capabilities that TJ needs for this recipe
var hardware = ['microphone', 'speaker', 'led', 'servo', "camera"];

// set up configuration paramters
var config = {
    log: {
        level: 'verbose'
    }
};
// instantiate our TJBot!
var tj = new tjbot(hardware, config, credentials);
tj.see().then(function(path) {
    console.log("saved file to path", path)
})
//tj.see();
