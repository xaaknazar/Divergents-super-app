const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const withStorybook = require('@storybook/react-native/metro/withStorybook');

module.exports = withStorybook(getDefaultConfig(__dirname), {
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true' && process.env.NODE_ENV !== 'production',
  configPath: path.resolve(__dirname, '.rnstorybook'),
  onDisabledRemoveStorybook: true,
});
