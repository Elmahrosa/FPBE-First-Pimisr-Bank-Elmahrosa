const sdk = require("microsoft-cognitiveservices-speech-sdk");
require("dotenv").config();

const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_REGION);
speechConfig.speechRecognitionLanguage = "id-ID";

const recognizeSpeech = () => {
    return new Promise((resolve, reject) => {
        const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        recognizer.recognizeOnceAsync((result) => {
            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
                resolve(result.text);
            } else {
                reject("Speech not recognized.");
            }
        });
    });
};

module.exports = recognizeSpeech;
