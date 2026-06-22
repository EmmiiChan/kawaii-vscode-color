"use strict";

const implementation = require("../out-scripts/scripts/build-color-theme.js");

if (require.main === module) {
  implementation.runCli();
}

module.exports = implementation;
