// This is a map of plugin names to npm packages representing those plugins.
// The plugins in this list will be available to the CLI so users can just
// type 'appium plugin install 'name'', rather than having to specify the full
// npm package. I.e., these are the officially recognized plugins.
const KNOWN_PLUGINS = {
  images: '@appium/images-plugin',
  'execute-driver': '@appium/execute-driver-plugin',
  'relaxed-caps': '@appium/relaxed-caps-plugin',
};

export {
  KNOWN_PLUGINS,
};
