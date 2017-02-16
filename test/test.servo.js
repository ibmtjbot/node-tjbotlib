'use strict';
var expect = require('chai').expect;
var tjbot = require('../lib/tjbot')
var tj = new tjbot(['servo'], {
    servoPin: 7 // make sure you have the correct pin number
}, {});


describe('#tjbot SERVO ARM', function() {
    it('should wave the robot arm', function() {
        var result = tj.wave();
        expect(result).to.be.true;
    });
});

// var endTime = new Date();
// console.log("time to shine led ", startTime, endTime, (startTime - endTime) / 1000)
