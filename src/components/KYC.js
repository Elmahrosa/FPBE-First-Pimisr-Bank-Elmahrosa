import React, { useState } from 'react';
import { Button, Alert, ActivityIndicator, View } from 'react-native';

export default function KYC({ onComplete }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleKYC = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://your-backend/kyc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 'USER_ID' }),
            });

            if (!response.ok) {
                throw new Error('KYC submission failed. Please try again.');
            }

            onComplete();
        } catch (error) {
            setError(error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View>
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <Button title="Complete KYC" onPress={handleKYC} />
            )}
            {error && <Text style={{ color: 'red' }}>{error}</Text>}
        </View>
    );
}
