// Metro loads its configuration as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '../..');

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules'), path.resolve(workspaceRoot, 'node_modules')],
  },
});
