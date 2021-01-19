# TJBotLib Migration Guide

## Migrating from 1.x to 2.x
There have been several significant changes to the 2.x release of TJBotLib that break compatability with the 1.x release. Please use this guide, the new [TJBot API docs](https://ibmtjbot.github.io/docs/tjbot/2.0.1/), and the [updated recipes](https://github.com/ibmtjbot/tjbot/tree/master/recipes) in the `tjbot` repository, to help you migrate your recipes to the new 2.x API.

### ES6 Module
TJBot is now packaged as an ES6 module, meaning it can be imported as follows:

    import TJBot from 'tjbot';

Because of this new packaging, TJBotLib requires Node 15.x.

### `async`/`await` Semantics
TJBot now uses `async`/`await` semantics rather than `Promise` semantics. This change has resulted in much cleaner, and easier to understand code. Thus, functions that used to return promises (e.g. `tj.analyzeTone()`) should now be called with `await`.

 For example:

    const tone = await tj.analyzeTone(text);

Methods that require `await`-ing a result are marked with `@async` in their JSDoc header.

### Changes to tj.listen()
Due to the new `async`/`await` semantics, the callback from `tj.listen()` has been removed in favor of a single-shot call using `await`. Thus, code that used to call `tj.listen()` in the following manner:

    tj.listen((message) => {
        ...
    });

must now call `tj.listen()` in a `while` loop as follows:

    while (true) {
        const message = await tj.listen();
        ...
    }

Methods for `tj.pauseListening()`, `tj.resumeListening()`, and `tj.stopListening()` have also been removed given the new `await` semantics on `tj.listen()`. Internally, TJBot will still pause and resume the microphone when sound is being played over the speaker to prevent an active `tj.listen()` call from picking up sound from the speaker.

### Static constants for hardware, capabilities, and services & separate hardware initialization
TJBot now defines constants for its hardware and capabilities in `TJBot.CAPABILITIES`, `TJBot.HARDWARE`, and `TJBot.SERVICES`. TJBot also has a new `initialize()` method for setting (or resetting) its hardware configuration, which must be called after the constructor. Please use these constants when initializing TJBot.

    const hardware = [TJBot.HARDWARE.LED, TJBot.HARDWARE.SPEAKER];
    const tj = new TJBot();
    tj.initialize(hardware);

### Lazy service initialization
TJBot will now initialize a Watson service only when it is first used, as part of `tj._assertCapability()`. For example, the first call to `tj.converse()` will first assert the `converse` capability, forcing initializtion of an `AssistantV2` instance. The net effect of this change is that TJBot's initial load should be faster, with a slight increase in the latency of the first Watson service call.

### Watson service authentication
All Watson service authentication is handled via IAM, with credentails stored in the `ibm-credentials.env` file. If you wish to keep this file somewhere else in your filesystem, you may pass in a path to this file in TJBot's constructor:

    const tj = new TJBot({...}, '/path/to/credentials.env')

If you have a legacy Watson service instance that uses username/password authentication, please note that you will no longer be able to use this instance with TJBot. We recommend deleting and re-creating those instances to enable IAM authentication.

### Change to visual recognition
The Watson Visual Recognition service removed the ability to perform OCR on an image. Thus, the methods `tj.read()` and `tj.recognizeTextInPhoto()` have been removed.

### Translation enhancements
There are a few new methods for translation, such as `tj.translatableLanguages()`, `tj.languageForCode()`, and `tj.codeForLanguage()`. These methods are showcased in the new `translator` recipe included in the `tjbot` repository.

### LED enhancements
There is a new configuration option, `TJBot.DEFAULT_CONFIG.shine.grbFormat`. If true, TJBot will send colors to the LED in GRB format; if false, TJBot will send colors to the LED in RGB format.

### Documentation enhancements
All TJBotLib code has been commented using JSDoc syntax. Please see the [API docs](https://ibmtjbot.github.io/docs/tjbot/2.0.1/) for a complete documentation reference.
