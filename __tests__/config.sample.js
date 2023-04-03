export default {
    assistantId: '', // add your assistant id from Watson Assistant
    hasCamera: true, // set this to false if your TJBot doesn't have a camera
    robotName: 'Watson', // set this to the name you wish to use to address your tjbot!
    sentimentKeyword: 'education', // keyword to monitor in Twitter
    sentimentAnalysisFrequencySec: 30, // analyze sentiment every N seconds
    twitterCredentials: {
        consumerKey: '',
        consumerSecret: '',
        accessTokenKey: '',
        accessTokenSecret: '',
    },
};
