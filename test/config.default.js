exports.webServerNumber = 8078;

// User-specific CONFIGURATION
exports.conversationWorkspaceId = '';

// Tjbot library config - modify as needed
exports.tjConfig = {
  log: {
    level: 'verbose'
  },
  listen: {
    microphoneDeviceId: "plughw:1,0", // plugged-in USB card 1, device 0; see arecord -l for a list of recording devices
    inactivityTimeout: -1, // -1 to never timeout or break the connection. Set this to a value in seconds e.g 120 to end connection after 120 seconds of silence
    language: 'en-US', // see TJBot.prototype.languages.listen
    customizationId: '' // to use speech to text language model customizations
  },
  speak: {
    language: 'en-US', // see TJBot.prototype.languages.speak
    voice: undefined, // use a specific voice; if undefined, a voice is chosen based on robot.gender and speak.language
    speakerDeviceId: "plughw:0,0", // plugged-in USB card 1, device 0; see aplay -l for a list of playback devices
    soundPlayer: "ffplay",
    queueSpeech: false //// queue a request to play/speak if there is something already playing.
  },
  see: {
    confidenceThreshold: {
      object: 0.5, // only list image tags with confidence > 0.5
      text: 0.1 // only list text tags with confidence > 0.5
    },
    camera: {
      height: 720,
      width: 960,
      verticalFlip: false, // flips the image vertically, may need to set to 'true' if the camera is installed upside-down
      horizontalFlip: false // flips the image horizontally, should not need to be overridden
    }
  }
};
// Setup Weather location details

exports.weather = {
  city: "denver",
  state: "CO",
  country: "US"
}

// Create the credentials object for export
exports.credentials = {};

// Watson Conversation
// https://www.ibm.com/watson/developercloud/conversation.html
exports.credentials.conversation = {
  password: '',
  username: ''
};

// Watson Speech to Text
// https://www.ibm.com/watson/developercloud/speech-to-text.html
exports.credentials.speech_to_text = {
  password: '',
  username: ''
};

// Watson Text to Speech
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.text_to_speech = {
  password: '',
  username: ''
};

// Watson Tone Analyzer
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.tone_analyzer = {
  password: '',
  username: ''
};

// Watson Vision Recognition
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.visual_recognition = {
  api_key: '',
  version: '2016-05-19'
}

// IBM Weather Company
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.weather = {
  url: "",
  username: ' ',
  password: ' ',
  host: " ",
  port: 443,
};
