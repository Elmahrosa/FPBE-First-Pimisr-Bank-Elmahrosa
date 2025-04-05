import React from 'react';
import { Button, Alert } from 'react-native';
import { sendPi } from '../utils/piWallet';

export default function Charity() {
    const handleDonation = async () => {
        try {
            await sendPi('CHARITY_ADDRESS', '1');
            Alert.alert('Success', 'Donated 1 Pi to charity!');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return <Button title="Donate 1 Pi" onPress={handleDonation} />;
}
