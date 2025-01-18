// React Native Configuration v0.71+
// Manages font assets, dependencies, and project-wide settings for FPBE mobile banking application

module.exports = {
  project: {
    ios: {
      // iOS-specific configuration
      assets: ['./src/assets/fonts/'],
      // Enable font scaling for accessibility
      fontScaling: true,
      // Define system fallbacks for iOS
      fontFallbacks: {
        'SF-Pro-Display': 'System'
      }
    },
    android: {
      // Android-specific configuration
      assets: ['./src/assets/fonts/'],
      // Enable font scaling for accessibility
      fontScaling: true,
      // Define system fallbacks for Android
      fontFallbacks: {
        'Roboto': 'sans-serif'
      }
    }
  },
  // Configure dependencies
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          projectDirectory: './ios'
        },
        android: {
          sourceDir: './android'
        }
      }
    }
  },
  // Define assets to be linked
  assets: [
    // iOS primary fonts
    './src/assets/fonts/SF-Pro-Display-Bold.otf',
    './src/assets/fonts/SF-Pro-Display-Medium.otf',
    './src/assets/fonts/SF-Pro-Display-Regular.otf',
    
    // Android primary fonts
    './src/assets/fonts/Roboto-Bold.ttf',
    './src/assets/fonts/Roboto-Medium.ttf',
    './src/assets/fonts/Roboto-Regular.ttf'
  ]
};