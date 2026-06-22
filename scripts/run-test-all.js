"use strict";

const implementation = require("../out-scripts/scripts/run-test-all.js");

if (require.main === module) {
    implementation.runCli().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = implementation;
