// src/web/src/App.tsx
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { NativeBaseProvider, Box, Spinner, Text } from 'native-base';
import { store } from './store/store'; // Adjust path if needed
import DashboardScreen from './screens/DashboardScreen';
import LoginScreen from './screens/LoginScreen';

// Simple client-only hook to avoid hydration mismatch
function useIsHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

const App: React.FC = () => {
  const isHydrated = useIsHydrated();
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Replace with real auth logic

  if (!isHydrated) {
    // Render a placeholder on server and during hydration
    return (
      <NativeBaseProvider>
        <Box flex={1} justifyContent="center" alignItems="center" height="100vh">
          <Spinner size="lg" accessibilityLabel="Loading app..." />
          <Text mt={4}>Loading...</Text>
        </Box>
      </NativeBaseProvider>
    );
  }

  return (
    <Provider store={store}>
      <NativeBaseProvider>
        {/* suppressHydrationWarning to avoid React hydration errors on dynamic content */}
        <Box suppressHydrationWarning flex={1} height="100vh" bg="gray.50" p={4}>
          {isLoggedIn ? (
            <DashboardScreen />
          ) : (
            <LoginScreen onLogin={() => setIsLoggedIn(true)} />
          )}
        </Box>
      </NativeBaseProvider>
    </Provider>
  );
};

export default App;
