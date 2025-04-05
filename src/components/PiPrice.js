import React, { useState, useEffect } from 'react';
import { Text, View, ActivityIndicator, Alert } from 'react-native';
import { localizePiPrice } from '../utils/currency';

const fetchCurrentPiPrice = async () => {
    try {
        // Replace with your actual API endpoint for fetching the current Pi price
        const response = await fetch('https://api.example.com/current-pi-price');
        if (!response.ok) {
            throw new Error('Failed to fetch current Pi price');
        }
        const data = await response.json();
        return data.price; // Assuming the API returns an object with a 'price' field
    } catch (error) {
        console.error('Error fetching current Pi price:', error);
        throw error; // Rethrow the error for handling in the calling function
    }
};

export default function PiPrice({ currency }) {
    const [price, setPrice] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPrice = async () => {
            setLoading(true);
            setError(null);
            try {
                const piPrice = await fetchCurrentPiPrice(); // Fetch the current Pi price
                const localized = await localizePiPrice(piPrice, currency);
                setPrice(localized);
            } catch (error) {
                setError('Failed to load Pi price. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();

        // Set up a WebSocket or similar for real-time updates (optional)
        const socket = new WebSocket('wss://api.example.com/pi-price-updates');
        socket.onmessage = (event) => {
            const updatedPrice = JSON.parse(event.data).price;
            localizePiPrice(updatedPrice, currency).then(setPrice);
        };

        const interval = setInterval(fetchPrice, 60000); // Fallback to polling every minute
        return () => {
            clearInterval(interval);
            socket.close(); // Clean up the WebSocket connection
        };
    }, [currency]);

    if (loading) {
        return (
            <View>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Loading Pi price...</Text>
            </View>
        );
    }

    if (error) {
        Alert.alert('Error', error);
        return <Text style={{ color: 'red' }}>{error}</Text>;
    }

    return <Text>1 Pi = {price} {currency} (Fee: 0.5%)</Text>;
}
