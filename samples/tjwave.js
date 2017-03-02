/**
 * Sample code to wave the tjbot arm and respond to other voice commands.
 * Converting this to use the new TJBot Library
 */
var tjbot = require('../lib/tjbot');
var constants = require('./config');
var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var request = require("request");
var fs = require('fs');

// obtain our credentials from config.js
var credentials = constants.credentials;

// obtain user-specific config
var VOICE = constants.config.voice;
var WORKSPACEID = constants.config.conversationWorkspaceId;

// these are the hardware capabilities that TJ needs for this recipe
var hardware = ['microphone', 'speaker', 'led', 'servo'];

// Set up configuration paramters
var config = {
    verboseLogging: true, //enable console debugging
    servoPin: 7, // set servo pin
    cameraParams: {
        height: 720,
        width: 960,
        vflip: true,
        hflilp: true
    } // setup my camera capture parameters
};
// obtain our configs from config.js and merge with custom configs
config = Object.assign(constants.config, config);

// instantiate our TJBot!
var tj = new tjbot(hardware, config, credentials);


// listen for utterances send the result to
// the Conversation service
tj.listen(function(msg) {

    // send to the conversation service
    tj.converse(WORKSPACEID, msg, function(response) {
        // speak the result
        if (response.object.output.text.length > 0) {
            //console.log(response.object)
            conversation_response = response.object.output.text[0];
            if (conversation_response != undefined) {
                var matchedIntent = response.object.intents[0].intent; // intent with the highest confidence
                var intentconfidence = response.object.intents[0].confidence;
                console.log("> intents : ", response.object.intents);

                if (intentconfidence > 0.5) {
                    tj.shine("green");
                    if (matchedIntent == "dance") {
                        tj.speak(conversation_response).then(function() {
                            dance("club.wav")
                        });
                        //dance();
                    } else if (matchedIntent == "wave") {
                        tj.speak(conversation_response).then(function() {
                            // wave
                            tj.wave();
                            tj.wave();
                            tj.shine("white");
                        })
                    } else if (matchedIntent == "see") {
                        tj.speak(conversation_response).then(function() {
                            tj.see().then(function(response) {
                                console.log(" ... response .. ", response.description)
                                if (response.description != null) {
                                    tj.speak(response.description).then(function() {
                                        tj.shine("white");
                                    })
                                }
                            });
                        });
                    } else if (matchedIntent == "off_topic") {
                        // do nothing
                    } else {
                        tj.speak(conversation_response).then(function() {
                            tj.shine("white");
                        });
                    }

                } else {
                    tj.shine("red");
                    setTimeout(function() {
                        tj.shine("white");
                    }, 800);
                }

            } else {
                tj.shine("red");
                console.log("The response (output) text from your conversation is empty. Please check your conversation flow \n" + JSON.stringify(response))
            }
        } else {
            console.error("The conversation service did not return any response text.");
        }
        //console.log("conversation response", response)
    });

});


/**
 * [dance play a soundFile and dance to its beats]
 * @param  {[type]} soundFile [soundfile to be decoded and danced to]
 * @return {[type]}           [description]
 */
function dance(soundFile) {
    // Decode the sound file to get its digital signal data
    var audioContext = new AudioContext
    fs.readFile(soundFile, function(err, buf) {
        if (err) throw err
        audioContext.decodeAudioData(buf, function(audioBuffer) {
            console.log("> finished decoding sound file ", soundFile);
            findPeaks(audioBuffer.getChannelData(0), audioBuffer.sampleRate, soundFile);
        }, function(err) {
            throw err
        })
    })

}

/**
 * [_findPeaks find peaks or high energy positions in audioBuffer data and move arm based on that to simulate dance.]
 * @param  {[type]} audioBuffer [decoded audio data]
 * @param  {[type]} sampleRate  [audio sample rate]
 * @return {[type]}             [description]
 */
function findPeaks(audioBuffer, sampleRate, soundFile) {
    var interval = 0.05 * 1000;
    var index = 0;
    var step = Math.round(sampleRate * (interval / 1000));
    var max = 0;
    var prevmax = 0;
    var prevdiffthreshold = 0.3;

    var sampleSound = setInterval(function() {
        if (index >= audioBuffer.length) {
            clearInterval(sampleSound);
            tj.shine("white");
            return;
        }
        for (var i = index; i < index + step; i++) {
            max = audioBuffer[i] > max ? audioBuffer[i].toFixed(1) : max;
        }
        // Spot a significant increase or peak? Wave Arm
        if (max - prevmax >= prevdiffthreshold) {
            // do some funky waving.
            var delay = 300;
            tj.raiseArm();
            setTimeout(function() {
                tj.lowerArm();
            }, delay);
        }
        prevmax = max;
        max = 0;
        index += step;
    }, interval);
    tj.playSound(soundFile);
}

var isPlaying = false;
var spawn = require('child_process').spawn;

function playsound(soundfile) {
    isPlaying = true;
    tj.pauseListening();
    var destination = "preview.wav"
    console.log("Playing soundfile " + soundfile)
    const ls = spawn('mpg321', [soundfile, '-g', '50']);

    ls.on('close', (code) => {
        console.log('Done with music playback!');
        isPlaying = false;
        tj.resumeListening();
    });
}
