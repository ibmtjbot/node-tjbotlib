// var startTime = new Date();

'use strict';
var expect = require('chai').expect;
var tjbot = require('../lib/tjbot')
var tj = new tjbot(['led'], {}, {});

describe('#tjbot LED', function() {
    it('should turn led color to red', function() {
        var result = tj.shine('red')
        expect(result).to.be.true;
    });
});

// var endTime = new Date();
// console.log("time to shine led ", startTime, endTime, (startTime - endTime) / 1000)
