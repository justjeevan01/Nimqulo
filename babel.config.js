module.exports = function (api) {
  api.cache(true);
  // Use explicit NativeWind components. Its global JSX wrapper drops existing
  // Pressable style callbacks, which are used throughout the reference screens.
  return { presets: ["babel-preset-expo"] };
};
