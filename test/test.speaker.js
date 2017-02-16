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
