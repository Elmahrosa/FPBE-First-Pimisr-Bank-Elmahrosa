import React from 'react';
import { Button, Alert } from 'react-native';
import Voice from '@react-native-voice/voice';

export default function VoiceControl() {
    const startVoiceRecognition = () => {
        Voice.onSpeechResults = (e) => {
            if (e.value[0].includes('buy 10 pi')) {
                Alert.alert('Action', 'Buying 10 Pi');
            }
        };

        Voice.start('en-US').catch((error) => {
            Alert.alert('Error', 'Voice recognition failed: ' + error.message);
        });
    };

    return <Button title="Start Voice" onPress={startVoiceRecognition} />;
}
