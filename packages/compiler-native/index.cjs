'use strict';

const binaries = {
  'darwin-arm64': 'cssx_compiler_node.darwin-arm64.node',
  'linux-x64': 'cssx_compiler_node.linux-x64.node',
  'win32-x64': 'cssx_compiler_node.win32-x64.node',
};

const binary = binaries[`${process.platform}-${process.arch}`];

if (!binary) {
  module.exports = null;
} else {
  try {
    module.exports = module.require(`./native/${binary}`);
  } catch {
    module.exports = null;
  }
}
