import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import axios from 'axios';

const SwapScreen = () => {
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [secret, setSecret] = useState('');

  const initiateSwap = async () => {
    const res = await axios.post('http://localhost:3000/swap/initiate', { receiver, amount, secret });
    Alert.alert('Swap Initiated', res.data.message);
  };

  const completeSwap = async () => {
    const res = await axios.post('http://localhost:3000/swap/complete', { swapId: 'your_swap_id', secret });
    Alert.alert('Swap Completed', res.data.message);
  };

  return (
    <View>
      <TextInput placeholder="Receiver Address" value={receiver} onChangeText={setReceiver} />
      <TextInput placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
      <TextInput placeholder="Secret" value={secret} onChangeText={setSecret} />
      <Button title="Initiate Swap" onPress={initiateSwap} />
      <Button title="Complete Swap" onPress={completeSwap} />
    </View>
  );
};

export default SwapScreen;
