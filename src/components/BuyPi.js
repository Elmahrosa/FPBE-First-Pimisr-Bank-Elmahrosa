import React, { useState } from 'react';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Button, Text, View, ActivityIndicator, Alert } from 'react-native';

export default function BuyPi() {
    const { confirmPayment } = useStripe();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleBuyPi = async () => {
        setLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch('http://your-backend/buy-pi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: 1000, currency: 'usd', userPublicKey: 'USER_PUBLIC_KEY' }),
            });

            if (!response.ok) {
                throw new Error('Failed to initiate payment. Please try again.');
            }

            const { clientSecret, piAmount } = await response.json();
            const { error } = await confirmPayment(clientSecret, { paymentMethodType: 'Card' });

            if (error) {
                throw new Error(error.message);
            }

            Alert.alert('Success', `Bought ${piAmount} Pi!`);
        } catch (error) {
            setErrorMessage(error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ padding: 20 }}>
            <Text style={{ fontSize: 20, marginBottom: 10 }}>Buy Pi with Fiat</Text>
            <CardField style={{ height: 50, marginVertical: 30 }} />
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <Button title="Buy Pi" onPress={handleBuyPi} />
            )}
            {errorMessage ? <Text style={{ color: 'red' }}>{errorMessage}</Text> : null}
        </View>
    );
}
