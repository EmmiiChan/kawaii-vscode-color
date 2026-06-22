"use strict";

const implementation = require("../out-scripts/scripts/run-e2e.js");

if (require.main === module) {
    implementation.runCli();
}

module.exports = implementation;
