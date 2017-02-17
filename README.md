# TJBot

Node.js library that abstracts several functions for TJBot.


> Encapsulates basic functions for TJBot such as making your bot see, listen, speak, play sounds, etc.

Some of the functions exposed work with certain [IBM Watson Cognitive Services](https://www.ibm.com/watson/developercloud/services-catalog.html). For example "seeing" is powered by IBM's [Visual Recognition Api](https://www.ibm.com/watson/developercloud/visual-recognition.html). Similarly, speaking and listening are powered the IBM [Text to Speech](https://www.ibm.com/watson/developercloud/text-to-speech.html) and [Speech to Text](https://www.ibm.com/watson/developercloud/speech-to-text.html).
To use each of these services, you will need to add a config.js file to your application and add your credentials for each of the services you are interested in using.

- [tjbot.shine(color)](#tjbotshinecolor)
- [tjbot.pulse(color, duration,delay)](#tjbotpulsecolor-duration-delay)
- [tjob.speakAsync(message)](#tjbotseeasyncmode)
- [tjbot.wave()](#tjbotwave)
- [tjbot.listen()](#tjbotlisten)
- [tjbot.listenWithAttentionWord(tjbotlistenwithattentionword)](#)
- [tjbot.converse(workspaceId, message, callback)](#tjbotconverseworkspaceid-message-callback)
- [tjbot.seeAsync(mode)](#tjbotseeasyncmode)

## Installation

This module depends on your raspberry pi having an installation of several tools.

ALSA tools for sound recording.

```
  $ sudo apt-get update
  $ sudo apt-get upgrade
  $ sudo apt-get install alsa-base alsa-utils
```

After the above dependencies are installed, you can proceed to install the module using:

```
$ npm install tjbot
```

Next, please setup credentials for the IBM Watson Cognitive Services you will be using in your application.
A template for your configuration file (config.js) can be found in the library root folder ([config.default.js](/config.default.js)).

## API
Below is an example of how to use the module.


```

var tjbot = require('tjbot');
var config = require('./config'); // user configuration file

// obtain credentials from config.js
var credentials = config.credentials;

// these are the hardware capabilities that our TJ needs for this example
var hardware = ['led', 'microphone', 'speaker'];

// turn on debug logging to the console
var config = {
    verboseLogging: true  // enable console debugging
};

// instantiate the TJBot library!
var tj = new tjbot(hardware, config, credentials);

// Change LED color to red.
tj.shine("red");

```

## tjbot (hardware, config, credentials)

Returns a tjbot object instance that can be used to control the various hardware add-ons (e.g. microphone, speaker, led, servo arm, etc) and exposes some additional helper functions.


- hardware - JSON containing a strings for the various hardware components you would like access to. Valid options are `led`, `microphone`, `speaker`, `servo`, `camera`
- config - JSON containing configuration parameters.
- credentials - JSON containing credentials for various IBM Watson Cognitive services that can be integrated with TJBot.

## tjbot.shine(color)

Changes the color of the LED to the specified color.

- color - Color which may be in string or hex format. E.g `red`, `yellow` `#ffff`


## tjbot.pulse(color, duration, delay)

Continuously pulses a color until stopPulsing() is called.

- color - Color which may be in string or hex format. E.g `red`, `yellow` `#ffff`
- duration - integer representing pulse duration in seconds
- delay - integer representing delay in seconds

## tjbot.speakAsync(message)

Speaks a given message

- message - text to be spoken out

## tjbot.wave()

Waves robot arm up-down-up

## tjbot.listen()

listens for utterances from the microphone, returns a callback with the message transcript.


## tjbot.listenWithAttentionWord()

listens for utterances from the microphone, returns a callback with the message transcript only when the message starts with a given attentionword.

## tjbot.converse(workspaceId, message, callback)

Starts a conversation turn using the Watson conversation api.

- workspaceId - workspaceid, used to keep track of the conversation context.
- message - message sent to the conversation service.
- callback - callback function that returns the conversation response object and conversation response text.

## tjbot.seeAsync(mode)

Captures an image and analyzes it using the IBM Watson visual recognition service.

- mode - String variable that specifies the type of service used to analyze image. Values are     

   - `classify` - classify image across known tags
   -  `text` - recognize text within the image


## License
This library uses the [Apache License Version 2.0 software license] (LICENSE).
