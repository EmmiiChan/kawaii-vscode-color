"use strict";

const implementation = require("../out-scripts/scripts/update-theme-color-packs.js");

if (require.main === module) {
  implementation.runCli();
}

module.exports = implementation;
