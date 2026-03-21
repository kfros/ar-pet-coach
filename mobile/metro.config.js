const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration
 * https://expo.github.io/metro-config/
 *
 *
 @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

module.exports = config;