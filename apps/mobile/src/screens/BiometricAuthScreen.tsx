import React, { useEffect } from "react";
import { View, Text, Button, Alert } from "react-native";
import ReactNativeBiometrics from "react-native-biometrics";

const BiometricAuthScreen = ({ navigation }) => {
  const handleBiometric = async () => {
    const { available } = await ReactNativeBiometrics.isSensorAvailable();
    if (!available) {
      Alert.alert("Biometrics not available");
      return;
    }
    const result = await ReactNativeBiometrics.simplePrompt({ promptMessage: "Confirm your identity" });
    if (result.success) {
      navigation.replace("Home");
    } else {
      Alert.alert("Authentication failed");
    }
  };

  useEffect(() => {
    handleBiometric();
  }, []);

  return (
    <View>
      <Text>Biometric Authentication Required</Text>
      <Button title="Try Again" onPress={handleBiometric} />
    </View>
  );
};

export default BiometricAuthScreen;
