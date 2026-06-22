"use strict";

const implementation = require("../out-scripts/scripts/package-local-vsix.js");

if (require.main === module) {
  implementation.runCli();
}

module.exports = implementation;
