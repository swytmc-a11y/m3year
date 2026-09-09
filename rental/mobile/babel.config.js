module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets provides the Reanimated 4 worklets plugin.
    // It must be listed last.
    plugins: ["react-native-worklets/plugin"],
  };
};
