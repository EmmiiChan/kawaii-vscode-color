"use strict";

const implementation = require("../out-scripts/scripts/require-e2e-neon-flag.js");

if (require.main === module) {
    implementation.runCli();
}

module.exports = implementation;
