import React, { useState, useEffect } from 'react';
import { Text, ActivityIndicator, View, Alert } from 'react-native';

export default function PiPortfolio({ publicKey }) {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBalance = async () => {
        try {
            const res = await fetch(`https://api.testnet.minepi.com/balance/${publicKey}`);
            if (!res.ok) {
                throw new Error('Failed to fetch balance.');
            }
            const data = await res.json();
            setBalance(data.balance);
        } catch (error) {
            setError(error.message);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [publicKey]);

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" />;
    }

    return <Text>Your Pi: {balance}</Text>;
}
