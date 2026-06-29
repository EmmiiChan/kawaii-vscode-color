"use strict";

const implementation = require("../out-scripts/scripts/clean-test-artifacts.js");

if (require.main === module) {
  implementation.runCli();
}

module.exports = implementation;
