"use strict";

const implementation = require("../out-scripts/scripts/increment-package-version.js");

if (require.main === module) {
  implementation.runCli();
}

module.exports = implementation;
