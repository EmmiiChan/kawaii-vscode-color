const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const WORKER_ARG = "--test-all-worker";
const SUMMARY_FILE_ENV = "KAWAII_TEST_ALL_SUMMARY_FILE";
const SAFE_TEST_PHASES = [
    { name: "Unit", script: "test:unit" },
    { name: "DOM", script: "test:dom" },
    { name: "Integration", script: "test:integration", captureOutput: true },
    { name: "Safe E2E", script: "test:e2e" }
];
const DEFAULT_SUMMARY_DELAY_MS = 1000;

async function runAllSafeTests(options = {}) {
    const result = await runAllSafeTestPlan(options);
    const output = options.output || process.stdout;

    output.write(`${result.summary}\n`);

    return result.exitCode;
}

async function runAllSafeTestPlan(options = {}) {
    const phases = options.phases || SAFE_TEST_PHASES;
    const startedAt = Date.now();
    const results = [];

    for (let index = 0; index < phases.length; index += 1) {
        const phase = phases[index];
        const result = await runPhase(phase, options);
        results.push(result);

        if (result.status === "failed") {
            results.push(...createSkippedResults(phases.slice(index + 1)));
            break;
        }
    }

    await waitBeforeSummary(options);

    const totalDurationMs = Date.now() - startedAt;
    const summary = formatSummary(results, totalDurationMs);

    return {
        exitCode: results.some((result) => result.status === "failed") ? 1 : 0,
        results,
        summary,
        totalDurationMs
    };
}

function runPhase(phase, options = {}) {
    const startedAt = Date.now();
    const spawnImpl = options.spawn || spawn;
    const stdout = options.stdout || process.stdout;
    const stderr = options.stderr || process.stderr;
    const capturedOutputPath = phase.captureOutput ? createCapturedOutputPath(phase) : "";
    let capturedOutputFd;

    return new Promise((resolve) => {
        let settled = false;
        const stdio = ["ignore", "pipe", "pipe"];

        if (capturedOutputPath) {
            capturedOutputFd = fs.openSync(capturedOutputPath, "w");
            stdio[1] = capturedOutputFd;
            stdio[2] = capturedOutputFd;
        }

        const child = spawnImpl(getNpmExecutable(options.platform), ["run", phase.script], {
            cwd: options.cwd || process.cwd(),
            env: options.env || process.env,
            stdio
        });

        if (!capturedOutputPath && child.stdout) {
            child.stdout.on("data", (chunk) => stdout.write(chunk));
        }

        if (!capturedOutputPath && child.stderr) {
            child.stderr.on("data", (chunk) => stderr.write(chunk));
        }

        child.on("error", (error) => {
            if (settled) {
                return;
            }

            flushCapturedOutput(capturedOutputPath, capturedOutputFd, stdout);
            settle({
                name: phase.name,
                script: phase.script,
                status: "failed",
                durationMs: Date.now() - startedAt,
                exitCode: 1,
                error
            });
        });

        child.on("close", (code) => {
            if (settled) {
                return;
            }

            const exitCode = typeof code === "number" ? code : 1;

            flushCapturedOutput(capturedOutputPath, capturedOutputFd, stdout);
            settle({
                name: phase.name,
                script: phase.script,
                status: exitCode === 0 ? "passed" : "failed",
                durationMs: Date.now() - startedAt,
                exitCode
            });
        });

        function settle(result) {
            if (settled) {
                return;
            }

            settled = true;
            resolve(result);
        }
    });
}

function createCapturedOutputPath(phase) {
    const safeName = phase.script.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");

    return path.join(os.tmpdir(), `kawaii-test-all-${process.pid}-${Date.now()}-${safeName}.log`);
}

function flushCapturedOutput(capturedOutputPath, capturedOutputFd, output) {
    if (!capturedOutputPath) {
        return;
    }

    if (typeof capturedOutputFd === "number") {
        fs.closeSync(capturedOutputFd);
    }

    try {
        const capturedOutput = fs.readFileSync(capturedOutputPath, "utf8");

        if (capturedOutput) {
            output.write(capturedOutput);
            if (!capturedOutput.endsWith("\n")) {
                output.write("\n");
            }
        }
    } finally {
        try {
            fs.unlinkSync(capturedOutputPath);
        } catch (error) {
            if (!error || error.code !== "ENOENT") {
                output.write(`Failed to remove temporary test output file: ${error.message}\n`);
            }
        }
    }
}

function createSkippedResults(phases) {
    return phases.map((phase) => ({
        name: phase.name,
        script: phase.script,
        status: "skipped",
        durationMs: 0
    }));
}

function formatSummary(results, totalDurationMs) {
    const counts = getSummaryCounts(results);
    const resultLabel = counts.failed > 0 ? "FAIL" : "PASS";
    const maxNameLength = Math.max(...results.map((result) => result.name.length));
    const maxCommandLength = Math.max(...results.map((result) => getPhaseCommand(result).length));
    const lines = [
        "",
        "======================",
        "All Safe Tests Summary",
        "======================"
    ];

    for (const result of results) {
        lines.push([
            formatStatus(result.status).padEnd(4),
            result.name.padEnd(maxNameLength),
            getPhaseCommand(result).padEnd(maxCommandLength),
            formatDuration(result.durationMs)
        ].join("  "));

        if (result.error) {
            lines.push(`      ${result.error.message}`);
        }
    }

    lines.push("----------------------");
    lines.push(`Result: ${resultLabel}`);
    lines.push(`${counts.passed} passed, ${counts.failed} failed, ${counts.skipped} skipped`);
    lines.push(`Total duration: ${formatDuration(totalDurationMs)}`);

    return lines.join("\n");
}

function getSummaryCounts(results) {
    return results.reduce((counts, result) => {
        counts[result.status] += 1;
        return counts;
    }, { passed: 0, failed: 0, skipped: 0 });
}

function getPhaseCommand(result) {
    return `npm run ${result.script}`;
}

function formatStatus(status) {
    if (status === "passed") {
        return "PASS";
    }

    if (status === "failed") {
        return "FAIL";
    }

    return "SKIP";
}

function formatDuration(durationMs) {
    if (!durationMs) {
        return "-";
    }

    return `${(durationMs / 1000).toFixed(1)}s`;
}

function getNpmExecutable(platform = process.platform) {
    return platform === "win32" ? "npm.exe" : "npm";
}

function getSummaryDelayMs(options = {}) {
    if (typeof options.summaryDelayMs === "number" && options.summaryDelayMs >= 0) {
        return options.summaryDelayMs;
    }

    return DEFAULT_SUMMARY_DELAY_MS;
}

function waitBeforeSummary(options) {
    const delayMs = getSummaryDelayMs(options);

    if (delayMs === 0) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        setTimeout(resolve, delayMs);
    });
}

if (require.main === module) {
    runCli().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

async function runCli() {
    if (process.argv.includes(WORKER_ARG)) {
        const result = await runAllSafeTestPlan({ summaryDelayMs: 0 });
        const summaryFilePath = process.env[SUMMARY_FILE_ENV];

        if (summaryFilePath) {
            fs.writeFileSync(summaryFilePath, JSON.stringify({
                exitCode: result.exitCode,
                summary: result.summary
            }), "utf8");
        } else {
            process.stdout.write(`${result.summary}\n`);
        }

        process.exitCode = result.exitCode;
        return;
    }

    await runParentCli();
}

function runParentCli() {
    const summaryFilePath = path.join(
        os.tmpdir(),
        `kawaii-test-all-summary-${process.pid}-${Date.now()}.json`
    );

    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [__filename, WORKER_ARG], {
            cwd: process.cwd(),
            env: {
                ...process.env,
                [SUMMARY_FILE_ENV]: summaryFilePath
            },
            stdio: ["ignore", "pipe", "pipe"]
        });

        child.stdout.on("data", (chunk) => process.stdout.write(chunk));
        child.stderr.on("data", (chunk) => process.stderr.write(chunk));
        child.on("error", reject);
        child.on("close", (code) => {
            setTimeout(() => {
                const summaryResult = readSummaryResult(summaryFilePath, code);

                cleanupSummaryFile(summaryFilePath);
                process.stdout.write(`${summaryResult.summary}\n`);
                process.exitCode = summaryResult.exitCode;
                resolve();
            }, DEFAULT_SUMMARY_DELAY_MS);
        });
    });
}

function readSummaryResult(summaryFilePath, fallbackExitCode) {
    try {
        const summaryResult = JSON.parse(fs.readFileSync(summaryFilePath, "utf8"));

        return {
            exitCode: typeof summaryResult.exitCode === "number"
                ? summaryResult.exitCode
                : normalizeExitCode(fallbackExitCode),
            summary: typeof summaryResult.summary === "string"
                ? summaryResult.summary
                : formatMissingSummary(fallbackExitCode)
        };
    } catch (error) {
        return {
            exitCode: normalizeExitCode(fallbackExitCode),
            summary: formatMissingSummary(fallbackExitCode, error)
        };
    }
}

function cleanupSummaryFile(summaryFilePath) {
    try {
        fs.unlinkSync(summaryFilePath);
    } catch (error) {
        if (!error || error.code !== "ENOENT") {
            process.stderr.write(`Failed to remove temporary test summary file: ${error.message}\n`);
        }
    }
}

function normalizeExitCode(code) {
    return typeof code === "number" ? code : 1;
}

function formatMissingSummary(fallbackExitCode, error) {
    const lines = [
        "",
        "======================",
        "All Safe Tests Summary",
        "======================",
        "Result: FAIL",
        `test:all worker exited with code ${normalizeExitCode(fallbackExitCode)} before writing a summary.`
    ];

    if (error) {
        lines.push(error.message);
    }

    return lines.join("\n");
}

module.exports = {
    SAFE_TEST_PHASES,
    createSkippedResults,
    formatDuration,
    formatSummary,
    getNpmExecutable,
    getSummaryDelayMs,
    runAllSafeTestPlan,
    runAllSafeTests
};
