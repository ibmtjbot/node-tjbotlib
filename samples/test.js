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
var start = Date.now();
var end;
tj.takePhoto().then(function(path) {
    end = Date.now();
    console.log("saved file to path", path, (end - start) / 1000)
}).then(function() {
    start = Date.now();
    var cameraParams = [];

    var filePath = "bingo"
    cameraParams.push('--nopreview'); // no image preview .. makes capture 10x faster
    cameraParams.push('-o', filePath);
    cameraParams.push('-t', 1) // no time delay

    //console.log(cameraParams)
    var spawn = require('child_process').spawn('raspistill', cameraParams);
    spawn.on('exit', function(code) {
        end = Date.now();
        console.info("> saved image to temp file [" + filePath + "]" + "with exit code, " + code + (end - start) / 1000);

    });
})
//tj.see();
//
