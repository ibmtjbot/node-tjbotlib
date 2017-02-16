// User-specific configuration
exports.voice = 'en-US_MichaelVoice';
exports.conversationWorkspaceId = ''; // replace with the workspace identifier of your conversation

// Create the credentials object for export
exports.credentials = {};

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

// Watson Conversation
// https://www.ibm.com/watson/developercloud/conversation.html
exports.credentials.conversation = {
    password: '',
    username: ''
};

// Watson Vision Recognition
// https://www.ibm.com/watson/developercloud/text-to-speech.html
exports.credentials.visual_recognition = {
    key: 'df447d2fc3abbbf7a675cc5977b8482bfe9130ef',
    version: '2016-05-19'
}
