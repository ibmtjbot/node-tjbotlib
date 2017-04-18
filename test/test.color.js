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
const assert = require('assert');

describe('TJBot', function() {
    describe('#shineColors', function() {
        it('should return the list of shine colors', function() {
            var tj = new TJBot(['led'], {}, {});
            var colors = tj.shineColors();
            assert.ok(colors.length > 0);
        });
    });
    describe('#randomColor', function() {
        it('should return a random color', function() {
            var tj = new TJBot([], {}, {});
            var color = tj.randomColor();
            assert.ok(color);
        })
    })
});
