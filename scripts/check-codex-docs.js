"use strict";

const implementation = require("../out-scripts/scripts/check-codex-docs.js");

if (require.main === module) {
  implementation.main();
}

module.exports = implementation;
