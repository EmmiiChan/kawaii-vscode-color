const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const SCRIPT_PATH = path.join(__dirname, "require-e2e-neon-flag.js");
const REQUIRED_FLAG = "1";
const REFUSAL_MESSAGE = "Refusing to run real Neon Effect E2E";

test("require-e2e-neon-flag rejects Neon E2E without explicit acknowledgement", () => {
    const env = { ...process.env };
    delete env.KAWAII_E2E_ALLOW_NEON_PATCH;

    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
        cwd: path.join(__dirname, ".."),
        env,
        encoding: "utf-8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(REFUSAL_MESSAGE));
});

test("require-e2e-neon-flag allows Neon E2E with explicit acknowledgement", () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
        cwd: path.join(__dirname, ".."),
        env: {
            ...process.env,
            KAWAII_E2E_ALLOW_NEON_PATCH: REQUIRED_FLAG
        },
        encoding: "utf-8"
    });

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
});
