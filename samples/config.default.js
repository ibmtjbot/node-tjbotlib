// User-specific CONFIGURATION
exports.config = {}
exports.config.voice = {"gender": "female", "language": "en-US"};
exports.config.conversationWorkspaceId = ''; // replace with the workspace identifier of your conversation

// Card and Device found in command arecord -l of your hardware. In general 0,0 or 1,0 or 0,1
// If bot is closing without wait for listening you maybe have to change that parameter
exports.config.microphone = "plughw:0,0";
// Attention word that bot are waiting for
exports.config.attentionWord = 'TJ';
// To see log messages
exports.config.verboseLogging = false;

exports.config.ledPin = 8;
exports.config.servoPin = 7;
exports.config.ttsReconnect = true;
// Confidence threshold for tags from visual recognition service. Tags below this will be ignored.
exports.config.visionConfidenceThreshold = 0.5;
exports.config.visionTextConfidenceThreshold = 0.1;
exports.config.cameraParams = {
    height: 720,
    width: 960
}

// Create the CREDENTIALS object for export
exports.credentials = {
};

// Watson Speech to Text
// https://www.ibm.com/watson/developercloud/speech-to-text.html
exports.credentials.speech_to_text = {
  "username": "",
  "password": ""
};

// Watson Text to Speech
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.text_to_speech = {
  "username": "",
  "password": ""
};

// Watson Conversation
// https://www.ibm.com/watson/developercloud/conversation.html
exports.credentials.conversation = {
  "username": "",
  "password": ""
};

// Watson Vision Recognition
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.visual_recognition = {
    key: '',
    version: ''
}

// Watson Tone Analyzer
// https://www.ibm.com/watson/developercloud/tone-analyzer.html
exports.credentials.tone_analyzer = {
    password: '',
    username: ''
};

// Twitter
exports.credentials.twitter = {
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
};

exports.sentiment_keyword = "christmas";
