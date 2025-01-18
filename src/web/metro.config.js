/**
 * Metro configuration for FPBE Mobile Banking Application
 * @version 1.0.0
 * @requires @react-native/metro-config ^0.72.0
 */

const { getDefaultConfig } = require('@react-native/metro-config');

/**
 * Metro bundler configuration with enhanced security and performance optimizations
 * for FPBE mobile banking cross-platform application
 */
const config = async () => {
  const defaultConfig = await getDefaultConfig(__dirname);

  return {
    ...defaultConfig,
    
    // Transformer configuration for optimized bundling
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          inlineRequires: true,
          enableBabelRuntime: true,
          enableBabelRCLookup: false,
        },
      }),
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      assetPlugins: ['react-native-asset-plugin'],
      sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
      experimentalImportSupport: true,
      enableBabelTransformerExperimentalImportSupport: true,
    },

    // Resolver configuration for module and asset handling
    resolver: {
      // Asset extensions supported by the bundler
      assetExts: [
        'png',
        'jpg',
        'jpeg',
        'gif',
        'webp',
        'svg',
        'ttf',
        'otf',
        'woff',
        'woff2',
        'eot'
      ],
      
      // Source file extensions with TypeScript prioritized
      sourceExts: ['tsx', 'ts', 'jsx', 'js', 'json'],
      
      // Platform-specific file extensions
      platforms: ['ios', 'android'],
      
      // Security blocklist to prevent bundling of unnecessary modules
      blockList: [
        /node_modules[/\\]react[/\\]dist[/\\].*/,
        /node_modules[/\\]core-js[/\\].*/,
        /node_modules[/\\]@babel[/\\]runtime[/\\].*/
      ],
      
      // Polyfills and module replacements for native functionality
      extraNodeModules: {
        'crypto': 'react-native-crypto',
        'stream': 'readable-stream',
        'vm': 'vm-browserify'
      },
      
      // Disable Haste module system for better performance
      hasteImplModulePath: null,
      
      // Enable Watchman for efficient file watching
      useWatchman: true
    },

    // Cache configuration for improved rebuild performance
    cacheVersion: '1.0.0',
    maxWorkers: 4,
    resetCache: false,
    
    // Project root and watch configuration
    projectRoot: '.',
    watchFolders: ['node_modules']
  };
};

module.exports = config;