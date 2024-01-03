# TJBot Library

> Node.js library that encapsulates TJBot's capabilities: listening, looking, shining, speaking, and waving.

This library can be used to create your own recipes for [TJBot](http://ibm.biz/mytjbot).

Some of TJBot's capabilities require [IBM Cloud](https://www.ibm.com/cloud) services. For example, seeing is powered by the [IBM Watson Visual Recognition](https://www.ibm.com/cloud/watson-visual-recognition) service. Speaking and listening are powered by the [IBM Watson Text to Speech](https://www.ibm.com/cloud/watson-text-to-speech) and [IBM Watson Speech to Text](https://www.ibm.com/cloud/watson-speech-to-text) services.

To use these services, you will need to sign up for a free [IBM Cloud](https://www.ibm.com/cloud) account, create instances of the services you need, and download the authentication credentials.

## Usage

1. Install the library using `npm`.

```sh
$ npm install --save tjbot
```

> 💡 Note: The TJBot library was developed for use on Raspberry Pi. It may be possible to develop and test portions of this library on other Linux-based systems (e.g. Ubuntu), but this usage is not officially supported.

2. Create a new Node.js script and import the TJBot library.

TJBot is packaged as both an ES6 and a CommonJS module (explained in [this guide](https://www.sensedeep.com/blog/posts/2021/how-to-create-single-source-npm-module.html)), which means you may import it using either the ES6 `import` statement or the CommonJS `require` method.

For ES6, import TJBot as follows:

```
import TJBot from 'tjbot';
```

For CommonJS, import TJBot as follows:

```
const TJBot = require('tjbot').default;
```

> 💡 Note: For CommonJS, the `TJBot` class is exported under a `.default` reference.

3. Instantiate the `TJBot` object.

```js
const tj = new TJBot();
tj.initialize([
    TJBot.Hardware.LED_NEOPIXEL, 
    TJBot.Hardware.SERVO, 
    TJBot.Hardware.MICROPHONE, 
    TJBot.Hardware.SPEAKER]);
```

This code will configure your TJBot with a NeoPixel LED (Common Anode LEDs are also supported), a servo, a microphone, and a speaker. The default configuration of TJBot uses English as the main language with a male voice.

The entire list of hardware devices supported by TJBot is defined in `TJBot.Hardware`:

```js
static Hardware = {
    CAMERA: 'camera',
    LED_NEOPIXEL: 'led_neopixel',
    LED_COMMON_ANODE: 'led_common_anode',
    MICROPHONE: 'microphone',
    SERVO: 'servo',
    SPEAKER: 'speaker',
};
```

### TJBot Configuration

TJBot's configuration is specified in a [TOML](https://toml.io/en/) file. By default, TJBot loads user-specific configuration from `tjbot.toml` in the same directory as your recipe, but this path may be specified in the TJBot constructor using the `configFile` argument.

The default TJBot configuration is shown below. Values specified in your own `tjbot.toml` file are used to override these defaults.

```toml
[Log]
# valid levels are 'error', 'warning', 'info', 'verbose', 'debug'
level = 'info' 

[Listen]
microphoneDeviceId = -1
inactivityTimeout = -1
backgroundAudioSuppression = 0.4

# see https://cloud.ibm.com/docs/speech-to-text?topic=speech-to-text-models-ng for available languages
language = 'en-US_Multimedia'

[See]
# camera resolution is width x height
cameraResolution = [1920, 1080]

# if true, flips the camera image vertically
verticalFlip = false

# if true, flips the camera image horizontally
horizontalFlip = false

[Shine.NeoPixel]
# see https://pinout.xyz for a complete listing of RPi pins
gpioPin = 21 # GPIO21 / Physical pin 40

# if true, uses the GRB (instead of RGB) color format
grbFormat = false

[Shine.CommonAnode]
redPin = 19   # GPIO19 / Physical pin 35
greenPin = 13 # GPIO13 / Physical pin 33
bluePin = 12  # GPIO12 / Physical pin 32

[Speak]
# see https://cloud.ibm.com/docs/text-to-speech?topic=text-to-speech-voices for available voices
voice = 'en-US_MichaelV3Voice'

# use 'aplay -l' to see a list of playback devices
speakerDeviceId = 'plughw:0,0' # plugged-in USB card 0, device 0

[Wave]
servoPin = 7 # GPIO7 / Physical Pin 26
```

### IBM Watson Credentials

If you are using IBM Watson services, store your authentication credentials in a file named `ibm-credentials.env`. Credentials may be downloaded from the page for your service instance, in the section named "Credentials."

If you are using multiple IBM Watson services, you may combine all of the credentials together in a single file.

The file `ibm-credentials.sample.env` shows a sample of how credentials are stored.

> 💡 Note: You may also specify the path to the credentials file in the TJBot constructor using the `credentialsFile` argument. For example, `const tj = new TJBot(credentialsFile="/home/pi/my-credentials.env")`.

## Capabilities

TJBot has a number of capabilities that you can use to bring it to life. Capabilities are combinations of hardware and Watson services that enable TJBot's functionality. For example, "listening" is a combination of having a `speaker` and the `speech_to_text` service. Internally, the `_assertCapability()` method checks to make sure your TJBot is configured with the right hardware and services before it performs an action that depends on having a capability. Thus, the method used to make TJBot listen, `tj.listen()`, first checks that your TJBot has been configured with a `speaker` and the `speech_to_text` service.

TJBot's capabilities are:

- **Listening** with a microphone and the [Watson Speech to Text](https://www.ibm.com/cloud/watson-speech-to-text) service
- **Looking** with its (optional) camera
- **Shining** its LED
- **Speaking** with a speaker and the [Watson Text to Speech](https://www.ibm.com/cloud/watson-text-to-speech) service
- **Waving**  its arm with a servo

## TJBot API

Please see [the API docs](https://ibmtjbot.github.io/docs/node-tjbotlib/3.0.0/) for documentation of the TJBot API.

> 💡 Please see the [Migration Guide](MIGRATING.md) for guidance on migrating your code to the latest version of the TJBot API.

## Tests

`node-tjbotlib` uses the [Jest](https://jestjs.io) framework for basic testing of the library. These tests may be run from the `node-tjbotlib` directory using `npm`:

```sh
$ npm test
```

The tests run by this command only cover basic functionality. A separate suite of hardware tests exists in the [TJBot repository](https://github.com/ibmtjbot/tjbot) in the `tests` directory.

# Contributing

We encourage you to make enhancements to this library and contribute them back to us via a pull request.

## Setting up a development environment

The easiest way to hack on `node-tjbotlib` is to check out the source and use `npm` to link your project to the locally-checked out version.

1. Clone the `node-tjbotlib` repository.

```sh
$ cd Desktop
$ git clone git@github.com:ibmtjbot/node-tjbotlib.git
```

2. Create a new directory for writing test code (e.g. a new recipe). This directory shoudl be outside of the `node-tjbotlib` directory.

```sh
$ cd Desktop
$ mkdir tjbot-recipe && cd tjbot-recipe
$ npm init
...
$ cat > index.js
import TJBot from 'tjbot';
const tj = new TJBot();
<ctrl-d>
```

> 🤔 Since we use `import` in the example above, remember to add `"type": "module"` to your `package.json` file for `node` to be able to run the script!

3. Install the local checkout of `node-tjbotlib` using `npm`:

```sh
$ npm install ~/Desktop/node-tjbotlib/
```

4. Run your script.

```sh
$ node index.js
```

# License

This project uses the [Apache License Version 2.0](LICENSE) software license.
