# TJBot Library

> Node.js library that encapsulates TJBot's basic capabilities: seeing, listening, speaking, shining, etc.

This library can be used to create your own recipes for [TJBot](http://ibm.biz/mytjbot).

Some of TJBot's capabilities require specific [IBM Watson](https://www.ibm.com/watson/developercloud/services-catalog.html) services. For example, "seeing" is powered by the [Watson Visual Recognition](https://www.ibm.com/watson/developercloud/visual-recognition.html) service. Similarly, speaking and listening are powered by the [Watson Text to Speech](https://www.ibm.com/watson/developercloud/text-to-speech.html) and [Watson Speech to Text](https://www.ibm.com/watson/developercloud/speech-to-text.html) services.

To use these services, you will need to specify credentials for each of the Watson services you are interested in using.

# Usage

Install the library as follows.

```
$ npm install --save tjbot
```

> Note: The TJBot library was developed for use on Raspberry Pi. It may be possible to develop and test portions of this library on other Linux-based systems (e.g. Ubuntu), but this usage is not officially supported.

Instantiate the `TJBot` object.

```
const TJBot = require('tjbot');

var hardware = ['led', 'servo', 'microphone', 'speaker'];
var configuration = {
    robot: {
        gender: 'female'
    },
    listen: {
        language: 'ja-JP'
    },
    speak: {
        language: 'en-US'
    }
};
var credentials = {
    speech_to_text: {
        username: 'xxx',
        password: 'xxx'
    },
    text_to_speech: {
        username: 'xxx',
        password: 'xxx'
    }
}
var tj = new TJBot(hardware, configuration, credentials);
```

This will configure your TJBot as a female robot having an `LED`, `servo`, `microphone`, and `speaker`, and with the Watson `speech_to_text` and `text_to_speech` services. In addition, this robot is configured to listen in Japanese and speak in English (using a female voice).

The default configuration of TJBot uses English as the main language with a male voice.

The entire list of hardware devices supported by tjbot lib and the configuration parameters are shown below.

```
var hardware = ['led', 'servo', 'microphone', 'speaker','camera'];
var configuration = {
    log: {
        level: 'info' // valid levels are 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
    },
    robot: {
        gender: 'male', // see TJBot.prototype.genders
        name: 'Watson'
    },
    listen: {
        microphoneDeviceId: "plughw:1,0", // plugged-in USB card 1, device 0; see arecord -l for a list of recording devices
        inactivityTimeout: -1, // -1 to never timeout or break the connection. Set this to a value in seconds e.g 120 to end connection after 120 seconds of silence
        language: 'en-US' // see TJBot.prototype.languages.listen
    },
    wave: {
        servoPin: 7 // corresponds to BCM 7 / physical PIN 26
    },
    speak: {
        language: 'en-US', // see TJBot.prototype.languages.speak
        voice: undefined, // use a specific voice; if undefined, a voice is chosen based on robot.gender and speak.language
        speakerDeviceId: "plughw:0,0" // plugged-in USB card 1, device 0; see aplay -l for a list of playback devices
    },
    see: {
        confidenceThreshold: {
            object: 0.5,   // only list image tags with confidence > 0.5
            text: 0.1     // only list text tags with confidence > 0.5
        },
        camera: {
            height: 720,
            width: 960,
            verticalFlip: false, // flips the image vertically, may need to set to 'true' if the camera is installed upside-down
            horizontalFlip: false // flips the image horizontally, should not need to be overridden
        }
    }
};
```

# Capabilities

TJBot has a number of capabilities that you can use to bring him to life. Capabilities are combinations of hardware and Watson services that enable TJBot's functionality. For example, "listening" is a combination of having a `speaker` and the `speech_to_text` service. Internally, the `_assertCapability()` method checks to make sure your TJBot is configured with the right hardware and services before it performs an action that depends on having a capability. Thus, the method used to make TJBot listen, `tj.listen()`, first checks that your TJBot has been configured with a `speaker` and the `speech_to_text` service.

TJBot's capabilities are:

- **Analyzing Tone** [[tj.analyzeTone](#analyze-tone)] , which requres the [Watson Tone Analyzer](https://www.ibm.com/watson/developercloud/tone-analyzer.html) service
- **Conversing** [[tj.converse(workspaceId, message, callback)](#tjconverseworkspaceid-message-callback)], which requires the [Watson Assistant](https://www.ibm.com/watson/services/conversation/) service
- **Listening** [[tj.listen(callback)](#tjlistencallback)], which requires a microphone and the [Watson Speech to Text](https://www.ibm.com/watson/developercloud/speech-to-text.html) service
- **Seeing** [[tj.see()](#tjsee)], which requires a camera and the [Watson Visual Recognition](https://www.ibm.com/watson/developercloud/visual-recognition.html) service
- **Shining** [[tj.shine(color)](#tjshinecolor)], which requires an LED
- **Speaking** [[tj.speak(message)](#tjspeakmessage)], which requires a speaker and the [Watson Text to Speech](https://www.ibm.com/watson/developercloud/text-to-speech.html) service
- **Translating** [[tj.translate(text, sourceLanguage, targetLanguage)](#tjtranslatetext-sourcelanguage-targetlanguage)], which requires the [Watson Language Translator](https://www.ibm.com/watson/developercloud/language-translator.html) service
- **Waving** [[tj.wave()](#tjwave)], which requires a servo motor

The full list of capabilities can be accessed programatically via `TJBot.prototype.capabilities`, the full list of hardware components can be accessed programatically via `TJBot.prototype.hardware`, and the full list of Watson services can be accessed programatically via `TJBot.prototype.services`.

# TJBot API

## Constructor

The `TJBot` constructor takes three arguments: the list of hardware present in the robot, the configuration of the robot, and the set of Watson credentials.

```
function TJBot(hardware, configuration, credentials)
```

Valid options for `hardware` are defined in `TJBot.prototype.hardware`: `camera`, `led`, `microphone`, `servo`, and `speaker`.

The `credentials` object expects credentials to be defined for each Watson service needed by your application. Valid Watson services are defined in `TJBot.prototype.services`: `assistant`, `language_translator`, `speech_to_text`, `text_to_speech`, `tone_analyzer`, and `visual_recognition`.

Please see `TJBot.prototype._createServiceAPI()` to understand what kind of credentials are required for each specific service. Most services expect a `username` and `password`, although some (e.g. `visual_recognition` and `language_translator`) expect an `apikey`.

Example credentials object:

```
var credentials = {
	assistant: {
		username: 'xxx',
		password: 'yyy'
	},
	language_translator: {
		apikey: 'xxx'
	},
	speech_to_text: {
		username: 'xxx',
		password: 'yyy'
	},
	text_to_speech: {
		username: 'xxx',
		password: 'yyy'
	},
	tone_analyzer: {
		username: 'xxx',
		password: 'yyy'
	},
	visual_recognition: {
		apikey: 'xxx'
	}
};
```

## Configuration

TJBot has a number of configuration options for its hardware and behaviors. Defaults are given in `TJBot.prototype.defaultConfiguration`, and these are overridden by any options specified in the `TJBot` constructor.

The most common configuration options are:

- `robot.name`: This is the name of your TJBot! You can use this in your recipes to know when someone is speaking to your TJBot. The default name is 'Watson'.
- `robot.gender`: This is used to specify which voice is used in `text_to_speech`. Can either be `"male"` or `"female"`.
- `listen.language`: This is used to specify the language in which `speech_to_text` listens. See `TJBot.prototype.languages.listen` for all available options.
- `speak.language`: This is used to specify the language in which `text_to_speech` speaks. See `TJBot.prototype.languages.speak` for all available options.
- `verboseLogging`: Setting this to `true` will cause debug messages to be printed to the console.

Additional configuration options allow you to specify the PIN to which the servo is connected (`wave.servoPin`), the resolution of images captured from the camera (`see.camera.*`), thresholds on the confidence of object recognition for `visual_recognition` (`see.confidenceThreshold.*`), and the device ID used to access the microphone (`listen.microphoneDeviceId`).

# API Methods
A description of the public TJBot API is given below. There are a number of internal library methods that are prefixed with an underscore (`_`); these methods are not intended for use outside the scope of the library.

If you do need low-level access to the Watson APIs beyond the level provided by `TJBot`, you can access them as follows:

```
var tj = new TJBot(hardware, configuration, credentials);
tj._assistant; // the AssistantV1 service object
tj._languageTranslator; // the LanguageTranslatorV3 service object
tj._stt; // the SpeechToTextV1 service object
tj._tts; // the TextToSpeechV1 service object
tj._toneAnalyzer; // the ToneAnalyzerV3 service object
tj._visualRecognition; // the VisualRecognitionV3 service object
```

Please see the documentation for the [Watson Node SDK](https://github.com/watson-developer-cloud/node-sdk) for more details on these objects.

## Utility methods

### tj.sleep(msec)

Sleeps for the given number of milliseconds.

- `msec` is the number of milliseconds to sleep for.

Sleeping blocks the Node.js event loop.

## Analyze Tone

### tj.analyzeTone(text)

Analyzes the given text for the presence of emotions.

- `text` is the text to be analyzed

Sample usage:

```
tj.analyzeTone("hello world").then(function(response) {
    ...
});
```

Sample response:

```
response = {
  "sentences_tone": [
    {
      "sentence_id": 0,
      "text": "hello world",
      "tone_categories": [
        {
          "tones": [
            {
              "score": 0.058017,
              "tone_id": "anger",
              "tone_name": "Anger"
            },
            {
              "score": 0.09147,
              "tone_id": "disgust",
              "tone_name": "Disgust"
            },
            {
              "score": 0.045435,
              "tone_id": "fear",
              "tone_name": "Fear"
            },
            {
              "score": 0.45124,
              "tone_id": "joy",
              "tone_name": "Joy"
            },
            {
              "score": 0.203841,
              "tone_id": "sadness",
              "tone_name": "Sadness"
            }
          ],
          "category_id": "emotion_tone",
          "category_name": "Emotion Tone"
        },
        {
          "tones": [
            {
              "score": 0,
              "tone_id": "analytical",
              "tone_name": "Analytical"
            },
            {
              "score": 0,
              "tone_id": "confident",
              "tone_name": "Confident"
            },
            {
              "score": 0,
              "tone_id": "tentative",
              "tone_name": "Tentative"
            }
          ],
          "category_id": "language_tone",
          "category_name": "Language Tone"
        },
        {
          "tones": [
            {
              "score": 0.260072,
              "tone_id": "openness_big5",
              "tone_name": "Openness"
            },
            {
              "score": 0.274462,
              "tone_id": "conscientiousness_big5",
              "tone_name": "Conscientiousness"
            },
            {
              "score": 0.540392,
              "tone_id": "extraversion_big5",
              "tone_name": "Extraversion"
            },
            {
              "score": 0.599104,
              "tone_id": "agreeableness_big5",
              "tone_name": "Agreeableness"
            },
            {
              "score": 0.278807,
              "tone_id": "emotional_range_big5",
              "tone_name": "Emotional Range"
            }
          ],
          "category_id": "social_tone",
          "category_name": "Social Tone"
        }
      ],
      "className": "original-text--sentence_joy-low"
    }
  ]
}
```

## Converse

### tj.converse(workspaceId, message, callback)

Takes a conversational turn in the Assistant service.

- `workspaceId` specifies the workspace ID of the conversation in the Watson Assistant service
- `message` is the text of the conversational turn
- `callback` is called with the conversational response

Sample usage:

```
tj.converse(workspaceId, "hello world", function(response) {
    ...
});
```

Sample response:

```
response = {
    "object": {conversation response object},
    "description": "hello, how are you"
}
```

## Listen

### tj.listen(callback)

Opens the microphone and streams data to the `speech_to_text` service.

- `callback` is called with speech utterances as they are produced

Sample usage:

```
tj.listen(function(text) {
    ...
});
```

Sample response:

```
text = "hello tjbot my name is bobby"
```

### tj.pauseListening()

Pauses listening.

### tj.resumeListening()

Resumes listening.

### tj.stopListening()

Stops listening.

## See

### tj.see()

Returns a list of objects seen and their confidences.

Sample usage:

```
tj.see().then(function(objects) {
    ...
});
```

Sample response:

```
objects =
[
    {
        "class": "apple",
        "score": 0.645656
    },
    {
        "class": "fruit",
        "score": 0.598688
    },
    {
        "class": "food",
        "score": 0.598688
    },
    {
        "class": "orange",
        "score": 0.5
    },
    {
        "class": "vegetable",
        "score": 0.28905
    },
    {
        "class": "tree",
        "score": 0.28905
    }
]
```

### tj.recognizeObjectsInPhoto(filePath)

Returns a list of objects seen and their confidences in the given photo.

- `filePath` is the path to the photo to use.

Sample usage:

```
tj.recognizeObjectsInPhoto(filePath).then(function(objects)) {
    ...
});
```

The response is the same as `tj.see()`.

### tj.read()

Returns a list of text strings read by TJBot.

Sample usage:

```
tj.read().then(function(texts) {
    ...
});
```

Sample response:

```
TBD
```

### tj.recognizeTextInPhoto(filePath)

Returns a list of text strings read by TJBot in the given photo.

- `filePath` is the path to the photo to use.

Sample usage:

```
tj.recognizeTextInPhoto(filePath).then(function(texts)) {
    ...
});
```

The response is the same as `tj.read()`.

### tj.takePhoto(targetPath)

Takes an argument of the path `targetPath` where the image file should be saved. If `targetPath` is null, image is stored in a temporary location. This method also returns the location `filePath` where image file was saved.

Sample usage:

```
tj.takePhoto(targetPath).then(function(filePath) {
    ...
});
```

Sample response:

```
filePath = "test.jpg"
```

## Shine

### tj.shine(color)

Shines the LED the specified color.

- `color` may be specified as a name, e.g. `'red'` or `'blue'`, or it may be specified as a hex string, e.g. `'#FF0000'` or `'#0000FF'`.

A full list of colors that TJBot understands can be accessed via `tj.shineColors()`.

Sample usage:

```
tj.shine('orange');
tj.shine('pink');
tj.shine('#0A2C9F');
```

### tj.pulse(color, duration)

Pulses the LED the given color (e.g. fades in and out to the given color).

- `color` specifies the color of the pulse
- `duration` specifies how long the pulse should last. TJBot will throw an error if the duration is less than 0.5 seconds or greater than 2 seconds, as pulses outside of these bounds are not very reliable.

Sample usage:

```
tj.pulse('blue', 1.0);
```

### tj.shineColors()

Returns an array of all of the colors that TJBot understands.

### tj.randomColor()

Selects a random color from the array returned by `tj.shineColors()`.

## Speak

## tj.speak(message)

Speaks the given message using `text_to_speech`.

- `message` is the message to speak

Sample usage:

```
tj.speak("hello world").then(function() {
    return tj.speak("my name is tjbot");
}).then(function () {
    return tj.speak("it's very nice to meet you!");
});
```

In this example, TJBot will first speak "hello world". After audio playback has finished, it will then speak "my name is tjbot". After audio playback has finished, it will then speak "it's very nice to meet you!". The [Promise pattern](https://en.wikipedia.org/wiki/Futures_and_promises) is used here to ensure that statements can be spoken consecutively without interference.

## tj.play(soundFile)

Plays the given sound file.

- `soundFile` is the path to the sound file to play

Sample usage:

```
tj.play('/usr/share/doc/Greenfoot/scenarios/lunarlander/sounds/Explosion.wav');
```

# Translate

## tj.translate(text, sourceLanguage, targetLanguage)

Translates the given text from the source language to the target language.

- `sourceLanguage` is the 2 character string that identifies the language from which to translate
- `targetLanguage` is the 2 character string that identifies the language to which to translate

> Note: Not all languages can be translated to other languages! Use the method `tj.isTranslatable()` to determine if a translation model exists between a soruce and target langauge.

Below are examples of common languages and the 2 character strings used to represent them.

| Language | Code |
|---|---|
| Arabic | ar |
| Chinese | zh |
| German | de |
| English | en |
| French | fr |
| Italian | it |
| Japanese | ja |
| Korean | ko |
| Spanish | es |
| Portuguese | pt |

Sample usage:

```
tj.translate("Hello, my name is TJBot!", 'en', 'es').then(function(translation) {
    ...
});
```

Sample response:

```
translation = {
	"translations":[
		{
			"translation":"Hola, mi nombre es TJBot!"
		}
	],
	"word_count":5,
	"character_count":24
}
```

## tj.identifyLanguage(text)

Identifies the language in which the text was written.

- `text` is the text whose language should be identified

Sample usage:

```
tj.identifyLanguage("Hello, my name is TJBot!").then(function(languages) {
    ...
});

```

Sample response:

```
languages = {
	"languages":[
		{
			"language":"en",
			"confidence":0.865653
		},
		{
			"language":"af",
			"confidence":0.039473
		},
		{
			"language":"nl",
			"confidence":0.0276556
		},
		{
			"language":"nn",
			"confidence":0.0216675
		},
		...
	]
}
```

## tj.isTranslatable(sourceLanguage, targetLanguage)

Returns a Promise that resolves to `true` if there exists a translation model between the source language and the target language.

- `sourceLanguage` is the 2 character string that identifies the source language
- `targetLanguage` is the 2 character string that identifies the target language

> Note: This method is asynchronous due to the need to load the list of translation models available. If you are confident that the list of translation models has been loaded (e.g. you call `tj.isTranslatable()` a few seconds after your script has been running), you may wish to use the internal method `tj._isTranslatable()` instead.

Sample usage:

```
tj.isTranslatable('en', 'es').then(function(result) {
    if (result) {
        console.log("TJBot can translate between English and Spanish!");
    } else {
        console.log("TJBot cannot translate between English and Spanish.");
    }
});
```

Sample response:

```
TJBot can translate between English and Spanish!
```

# Wave

## tj.armBack()

Causes TJBot to move its arm backward (like a wind-up for a pitch).

> Note: if this method doesn't produce the expected result, the servo motor stop points may need to be overridden. Override the value of `TJBot.prototype._SERVO_ARM_BACK` to find a stop point that satisfies the "back" position. Note that valid servo values are in the range [500, 2300].

## tj.raiseArm()

Causes TJBot to raise its arm to the upward position.

> Note: if this method doesn't produce the expected result, the servo motor stop points may need to be overridden. Override the value of `TJBot.prototype._SERVO_ARM_UP` to find a stop point that satisfies the "back" position. Note that valid servo values are in the range [500, 2300].

## tj.lowerArm()

Causes TJBot to lower its arm to the downward position.

> Note: if this method doesn't produce the expected result, the servo motor stop points may need to be overridden. Override the value of `TJBot.prototype._SERVO_ARM_DOWN` to find a stop point that satisfies the "back" position. Note that valid servo values are in the range [500, 2300].

## tj.wave()

Causes TJBot to wave the arm once (up-down-up).

# Contributing
We encourage you to make enhancements to this library and contribute them back to us via a pull request.

# License
This project uses the [Apache License Version 2.0](LICENSE) software license.
