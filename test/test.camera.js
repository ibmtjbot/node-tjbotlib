// var tjbot = require('../lib/tjbot')
// var tj = new tjbot(['servo'], {
//     servoPin: 7
// }, {});
// tj.wave()

// var startTime = new Date();

'use strict';
var expect = require('chai').expect;
var tjbot = require('../lib/tjbot')
var tj = new tjbot(['camera'], {}, {});


describe('#tjbot CAMERA', function() {
    it('should take a picture and save to a location', function() {
        tj.captureImage("picture.jpg").then(function(result) {
            console.log("result is", result)
            expect(result).to.equal("picture.jpg");
        });
    });
});

// var endTime = new Date();
// console.log("time to shine led ", startTime, endTime, (startTime - endTime) / 1000)
