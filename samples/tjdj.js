/**
 * Play a snippet of any song
 *
 */
var tjbot = require('../lib/tjbot');
var constants = require('./config');
var request = require("request");
var fs = require('fs');
var AudioContext = require('web-audio-api').AudioContext

// obtain our credentials from config.js
var credentials = constants.credentials;

// obtain user-specific config
var VOICE = constants.config.voice;
var WORKSPACEID = constants.config.conversationWorkspaceId;

// these are the hardware capabilities that TJ needs for this recipe
var hardware = ['microphone', 'speaker', 'led', 'servo'];

// Set up configuration parameters
var config = {
  verboseLogging: true, //enable console debugging
  servoPin: 7 // set servo pin
};
// obtain our configs from config.js and merge with custom configs
config = Object.assign(constants.config, config);

// instantiate our TJBot!
var tj = new tjbot(hardware, config, credentials);
tj.shine("white")
//tj.dance("club.wav");

// listen for utterances and process them.
tj.listen(function(transcriptMessage) {
    var containsPlay = transcriptMessage.indexOf("play") >= -1;
    if (containsPlay) {
        transcriptMessage = transcriptMessage.replace("play", "");
        transcriptMessage = transcriptMessage.replace("song", "");
        console.log(" Command : ", transcriptMessage)
        if (transcriptMessage.length > 10) {
            searchSpotify(transcriptMessage);
            tj.shine("green");
        }
    } else {
        tj.shine("red")
        setTimeout(function() {
            tj.shine("white");
        }, 800);
    }
});

/**
 * [searchSpotify query the spotify api for the given searchTerm]
 * @param  {[type]} searchTerm [description]
 * @return {[type]}            [description]
 */
function searchSpotify(searchTerm) {
    console.log("searching spotify for " + searchTerm + " ....");
    var searchType = "track"
    var options = {
        method: 'GET',
        url: "https://api.spotify.com/v1/search",
        qs: {
            q: searchTerm.replace(/ /g, "+"),
            type: searchType,
            market: "US",
            limit: 20
        }
    }
    var trackartists = ""
    var maxpopularity = 0;
    var selectedtrack;

    request(options, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var result = JSON.parse(body)
            if (result.tracks.items.length > 0) {
                selectedtrack = result.tracks.items[0];
                result.tracks.items.forEach(function(track) {
                    selectedtrack = track.popularity > maxpopularity ? track : selectedtrack;
                    maxpopularity = track.popularity > maxpopularity ? track.popularity : maxpopularity;
                })
                //get selected track artists
                if (selectedtrack !== undefined) {
                    selectedtrack.artists.forEach(function(artist) {
                        trackartists = trackartists + artist.name + ", "
                    })
                    var searchResponseText = "Found song " + selectedtrack.name + " by " + trackartists;
                    console.log(searchResponseText, selectedtrack.popularity)
                    tj.speak(searchResponseText).then(function() {
                        downloadFile(selectedtrack.preview_url)
                    });
                }

            } else {
                console.log("no song found from spotify")
                tj.shine("red")
                setTimeout(function() {
                    tj.shine("white");
                }, 800);
            }

        } else {
            console.log(error + " error" + response.statusCode)
        }
    })
}

/**
 * [downloadFile download music file with given preview url]
 * @param  {[type]} url [url of song preview to be downloaded]
 * @return {[type]}     [description]
 */
function downloadFile(url) {
    var destinationFile = "preview.mp3"
    var file = fs.createWriteStream(destinationFile);
    var donwloadrequest = request.get(url);

    // verify response code
    donwloadrequest.on('response', function(response) {
        if (response.statusCode !== 200) {
            return cb('Response status was ' + response.statusCode);
        }
    });

    // check for request errors
    donwloadrequest.on('error', function(err) {
        fs.unlink(destinationFile);
    });
    donwloadrequest.pipe(file);
    file.on('finish', function() {
        file.close();
        dance(destinationFile);
    });

    file.on('error', function(err) { // Handle errors
        fs.unlink(destinationFile); // Delete the file async. (But we don't check the result)
    });
}

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
            //console.log("  soundbites ...>>> ", max - prevmax, max, prevmax)
        }
        prevmax = max;
        max = 0;
        index += step;
    }, interval);
    playsound(soundFile);
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
