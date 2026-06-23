"use strict";

const implementation = require("../out-scripts/scripts/build-ui-css.js");

if (require.main === module) {
  implementation.runCli();
}

module.exports = implementation;
