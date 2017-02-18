/************************************************************************
* Copyright 2016 IBM Corp. All Rights Reserved.
*
* Watson Maker Kits
*
* This project is licensed under the Apache License 2.0, see LICENSE.*
*
************************************************************************
*
* Control a NeoPixel LED unit connected to a Raspberry Pi pin by analyzing Twitter data using Watson Tone Analyzer
* Must run with root-level protection
* Sudo node sentiment.js

Based on ws281x library created by Jeremy Garff (jer@jers.net)

Follow the instructions in http://www.instructables.com/id/Make-Your-Robot-Respond-to-Emotions-Using-Watson/ to
get the system ready to run this code.
*/

/************************************************************************
* Step #1: Configuring your Twitter Credentials
************************************************************************
In this step, we set up our Twitter credentials and parameters (keywords) and the
fetch  tweets related to the keyword as text. Each tweet is added to a tweet buffer as it arrives
*/
var config = require("./config"); // Gets your username and passwords from the config.js file
var Twitter = require('twitter');
var maxtweets = 20;
var confidencethreshold = 0.5; // The program only responds to the sentiments that are retrieved with a confidence level stronger than this given threshold. You may change the threshold as needed.
var tweetbuffer = [];
var searchkeyword = config.sentiment_keyword; // keyword to use in twitter search

//twitter search parameters
var searchparams = {
    q: searchkeyword,
    count: maxtweets
};
var sentimentinterval = 3000; // calculate sentiment every 3 seconds.

var twitterclient = new Twitter({ //Retrieving your Twitter credentials
    consumer_key: config.credentials.twitter.consumer_key,
    consumer_secret: config.credentials.twitter.consumer_secret,
    access_token_key: config.credentials.twitter.access_token_key,
    access_token_secret: config.credentials.twitter.access_token_secret
});


fetchTweets(searchparams)

/**
 * [fetchTweets open a stream with twitter, fetch tweets Continuously, store in a buffer]
 * @param  {[type]} searchparams [description]
 * @return {[type]}              [description]
 */
function fetchTweets(searchparams) {
    var alltweets = "";
    console.log("Fetching tweets for keyword " + searchkeyword + ". This may take some time.");
    twitterclient.stream('statuses/filter', {
        track: searchkeyword
    }, function(stream) {
        stream.on('data', function(event) {
            if (event && event.text) {
                var tweet = event.text;
                tweet = tweet.replace(/[^\x00-\x7F]/g, "") // Remove non-ascii characters e.g chinese, japanese, arabic letters etc
                tweet = tweet.replace(/(?:https?|ftp):\/\/[\n\S]+/g, ""); // Remove link
                if (tweetbuffer.length == maxtweets) { // if we have enough tweets, remove one
                    tweetbuffer.shift();
                }
                tweetbuffer.push(tweet)

            }
        });

        stream.on('error', function(error) {
            console.log("\nAn error has occurred while connecting to Twitter. Please check your twitter credentials, and also refer to https://dev.twitter.com/overview/api/response-codes for more on twitter error codes. \n")
            throw error;
        });
    });
}

// Configure TJBot library
var tjbot = require('../lib/tjbot');
// these are the hardware capabilities that our TJ needs for this recipe
var hardware = ['led', 'servo'];

// obtain our credentials from config.js
var credentials = config.credentials;

// turn on debug logging to the console
var tjConfig = {
    verboseLogging: false
};

// instantiate our TJBot!
var tj = new tjbot(hardware, tjConfig, credentials);

SampleTweetBuffer();

/**
 * [SampleTweetBuffer compute sentiment on the stored tweet buffer at the given interval]
 */
function SampleTweetBuffer() {
    setInterval(function() {
        if (tweetbuffer.length > 0) {
            var text = "";
            tweetbuffer.forEach(function(tweet) {
                text = text + " " + tweet; // Combine all texts in the tweetbuffer array into a single text.
            })

            // tjbot library method tj.analyzeTone() uses Watson Tone Analyzer to analyze the emotions that are retrieved from the tweetbuffer.
            //The IBM Watson™ Tone Analyzer Service uses linguistic analysis to detect three types of tones from text: emotion, social tendencies, and language style.
            //Emotions identified include things like anger, fear, joy, sadness, and disgust.

            tj.analyzeTone(text).then(function(tone) {
                tone.document_tone.tone_categories.forEach(function(tonecategory) {
                    if (tonecategory.category_id == "emotion_tone") {
                        //console.log(tonecategory.tones)
                        tonecategory.tones.forEach(function(emotion) {
                            if (emotion.score >= confidencethreshold) { // pulse only if the likelihood of an emotion is above the given confidencethreshold
                                processEmotion(emotion)
                            }
                        })
                    }
                })
            })
        }
    }, sentimentinterval);
}



/*********************************************************************************************
* Step #3: Change the color of the LED based on the sentiments of the retrieve tweets
**********************************************************************************************
In this step, the program determines the color of the LED based on the analyzed emotion.
Different colors are associated to different emotions. You can customize your own color!
Anger = Red
Joy = Yellow
Fear = Purple etc
*/

var previousEmotion = "";

// Process emotion returned from Tone Analyzer Above
// Show a specific color fore each emotion
function processEmotion(emotion) {
    console.log("Current Emotion Around " + searchkeyword + " is ", emotion.tone_id);
    if (emotion.tone_id == "anger") {
        tj.shine("red");
    } else if (emotion.tone_id == "joy") {
        tj.shine("yellow");
    } else if (emotion.tone_id == "fear") {
        tj.shine("purple");
    } else if (emotion.tone_id == "disgust") {
        tj.shine("green");
    } else if (emotion.tone_id == "sadness") {
        tj.shine("blue");
    }


    if (emotion.tone_id != previousEmotion) {
        tj.wave();
        previousEmotion = emotion.tone_id;
    }

}
