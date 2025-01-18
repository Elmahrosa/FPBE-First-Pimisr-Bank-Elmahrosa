// @babel/preset-env version: ^7.20.0
// @babel/preset-typescript version: ^7.20.0
// metro-react-native-babel-preset version: ^0.75.0

module.exports = function(api) {
  // Cache the returned value forever and don't call this function again
  api.cache(true);

  // Configuration object for Babel transpilation
  return {
    // Presets configuration with React Native and TypeScript support
    presets: [
      [
        'module:metro-react-native-babel-preset',
        {
          enableBabelRuntime: true, // Enable runtime helpers for better performance
        }
      ],
      [
        '@babel/preset-typescript',
        {
          strict: true, // Enable strict mode for TypeScript
          allowNamespaces: true, // Allow TypeScript namespaces
          onlyRemoveTypeImports: true, // Only remove type imports for optimal bundle size
        }
      ]
    ],

    // Base plugins that apply to all environments
    plugins: [
      'react-native-reanimated/plugin', // Support for React Native Reanimated animations
    ],

    // Environment-specific configurations
    env: {
      development: {
        plugins: [
          'source-map-support', // Enable source maps for better debugging
        ],
      },
      production: {
        plugins: [
          'transform-remove-console', // Remove console.* statements in production
          [
            'transform-react-remove-prop-types', // Remove PropTypes in production for smaller bundle size
            {
              removeImport: true,
            }
          ],
        ],
      },
    },

    // Ignore test and spec files in production
    ignore: process.env.NODE_ENV === 'production' 
      ? [/\.test\.tsx?$/, /\.spec\.tsx?$/]
      : [],
  };
};