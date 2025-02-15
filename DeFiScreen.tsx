import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import axios from 'axios';

const CreditScoreScreen = () => {
  const [user, setUser] = useState('');
  const [score, setScore] = useState('');

  const getCreditScore = async () => {
    const res = await axios.get(`http://localhost:3000/credit-score/${user}`);
    setScore(res.data.score);
  };

  return (
    <View>
      <TextInput placeholder="User Address" value={user} onChangeText={setUser} />
      <Button title="Check Credit Score" onPress={getCreditScore} />
      {score && <Text>Your Credit Score: {score}</Text>}
    </View>
  );
};

export default CreditScoreScreen;
