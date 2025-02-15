import React from 'react';
import { View, Text, Button } from 'react-native';
import { useTranslation } from 'react-i18next';
import { handleRTL } from '../utils/rtl';

const HomeScreen = () => {
  const { t, i18n } = useTranslation();

  return (
    <View>
      <Text>{t('welcome')}</Text>
      <Button title="Switch to Bahasa Indonesia" onPress={() => { i18n.changeLanguage('id'); handleRTL('id'); }} />
      <Button title="Switch to English" onPress={() => { i18n.changeLanguage('en'); handleRTL('en'); }} />
    </View>
  );
};

export default HomeScreen;
