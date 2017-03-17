// User-specific CONFIGURATION
exports.config = {
    voice: {
        "gender": "male",
        "language": "en-US",
        "timeout": 60 // disconnect stt after 60 seconds. Use -1 for indefinite transciption (expensive)
    },
    conversationWorkspaceId: "", // replace with the workspace identifier of your conversation
    microphoneDeviceId: "plughw:0,0", // Card and Device found in command arecord -l of your hardware. In general 0,0 or 1,0 or 0,1
    // If bot is closing without wait for listening you maybe have to change that parameter
    attentionWord: 'TJ', // Attention word that triggers bot response
    verboseLogging: false, // To see log messages
    ledPin: 8,
    servoPin: 7,
    ttsReconnect: true,
    // Confidence threshold for tags from visual recognition service. Tags below this will be ignored.
    visionConfidenceThreshold: 0.5,
    visionTextConfidenceThreshold: 0.1,
    cameraParams: {
        height: 720,
        width: 960,
        vflip: false,
        hflip: false
    }
}


// Create the CREDENTIALS object for export
exports.credentials = {};

// Watson Speech to Text
// https://www.ibm.com/watson/developercloud/speech-to-text.html
exports.credentials.speech_to_text = {
    username: "",
    password: ""
};

// Watson Text to Speech
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.text_to_speech = {
    username: "",
    password: ""
};

// Watson Conversation
// https://www.ibm.com/watson/developercloud/conversation.html
exports.credentials.conversation = {
    username: "",
    password: ""
};

// Watson Vision Recognition
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.visual_recognition = {
    key: "",
    version: "v1"
}

// Watson Tone Analyzer
// https://www.ibm.com/watson/developercloud/tone-analyzer.html
exports.credentials.tone_analyzer = {
    password: "",
    username: ""
};

// Twitter
exports.credentials.twitter = {
    consumer_key: "",
    consumer_secret: "",
    access_token_key: "",
    access_token_secret: ""
};

exports.sentiment_keyword = "christmas";
