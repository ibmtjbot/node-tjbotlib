# TJBot [Beta]

Node.js library that abstracts several functions for TJBot.


> Encapsulates basic functions for TJBot such as making your bot see, listen, speak, play sounds, etc.

Some of the functions exposed work with certain [IBM Watson Cognitive Services](https://www.ibm.com/watson/developercloud/services-catalog.html). For example "seeing" is powered by IBM's [Visual Recognition Api](https://www.ibm.com/watson/developercloud/visual-recognition.html). Similarly, speaking and listening are powered the IBM [Text to Speech](https://www.ibm.com/watson/developercloud/text-to-speech.html) and [Speech to Text](https://www.ibm.com/watson/developercloud/speech-to-text.html).
To use each of these services, you will need to add a config.js file to your application and add your credentials for each of the services you are interested in using.

- [tjbot.shine(color)](#tjbotshinecolor)
- [tjbot.pulse(color, duration,delay)](#tjbotpulsecolor-duration-delay)
- [tjob.speak(message)](#tjbotseemode)
- [tjbot.wave()](#tjbotwave)
- [tjbot.listen(callback)](#tjbotlistencallback)
- [tjbot.converse(workspaceId, message, callback)](#tjbotconverseworkspaceid-message-callback)
- [tjbot.see(mode)](#tjbotseemode)

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

// obtain credentials from config.js, see config.default.js for more info.
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


- hardware - string array containing strings for the various hardware components you would like access to. Valid options are `led`, `microphone`, `speaker`, `servo`, `camera`
- config - JSON object containing configuration parameters.

  ```
  var config = {
      'attentionWord': 'TJ', // attention word for STT
      'ledPin': 8,    
      'servoPin': 7,
      'voice': 'en-US_MichaelVoice',
      'verboseLogging': false,  
      'ttsReconnect': true,    // reconnect to STT service on error
      'visionConfidenceThreshold': 0.5, // Confidence threshold for tags from visual recognition service. Tags below this will be ignored.
      'visionTextConfidenceThreshold': 0.1,
      'cameraParams': {
          height: 720,
          width: 960,
          vflip: true,   // vertical flip
          hflilp: true    // horizontal flip
      } //set camera params
  };
  ```
- credentials - JSON object containing credentials for various IBM Watson Cognitive services that can be integrated with TJBot.

## tjbot.shine(color)

Changes the color of the LED to the specified color.

- color - Color which may be in string or hex format. E.g `red`, `yellow` `#ffff`


## tjbot.pulse(color, duration, delay)

Continuously pulses a color until stopPulsing() is called.

- color - Color which may be in string or hex format. E.g `red`, `yellow` `#ffff`
- duration - integer representing pulse duration in seconds
- delay - integer representing delay in seconds

## tjbot.speak(message)

Speaks a given message. This method returns a promise with a string which is the path to the audio file that is played.

- message - text to be spoken out

## tjbot.wave()

Waves robot arm (up-down-up).

## tjbot.listen(callback)

listens for utterances from the microphone, takes a callback function as an argument.
- callback - function that is called whenever a new transcript arrives.



## tjbot.converse(workspaceId, message, callback)

Starts a conversation turn using the watson conversation api, takes a callback function as an argument.

- workspaceId - workspaceid, used to keep track of the conversation context.
- message - message sent to the conversation service.
- callback - function that is called whenever there is a response from the conversation service. This callback is called with a response object
  - response - JSON object {object: obj, description: string}
    - object - JSON object returned from the conversation api
    - description - String containing text returned from conversation service.

## tjbot.see(mode)

Captures an image, and analyzes it using the IBM Watson visual recognition service.

- mode - String variable that specifies the type of service used to analyze image. Values are     

   - `classify` - classify image across known tags
   -  `text` - recognize text within the image




## License
This library uses the [Apache License Version 2.0 software license] (LICENSE).
