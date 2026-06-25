"use strict";

const implementation = require("../out-scripts/scripts/test-process-cleanup-diagnostics.js");

if (require.main === module) {
    implementation.runCli();
}

module.exports = implementation;
