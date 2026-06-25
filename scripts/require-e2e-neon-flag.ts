const REQUIRED_NEON_FLAG = "1";
const REFUSAL_MESSAGE = "Refusing to run real Kawaii Neon E2E. Set KAWAII_E2E_ALLOW_NEON_PATCH=1 to acknowledge the patch risk.";

function isNeonPatchAcknowledged(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.KAWAII_E2E_ALLOW_NEON_PATCH === REQUIRED_NEON_FLAG;
}

function requireE2ENeonFlag(env: NodeJS.ProcessEnv = process.env): void {
    if (!isNeonPatchAcknowledged(env)) {
        throw new Error(REFUSAL_MESSAGE);
    }
}

function runCli(): void {
    try {
        requireE2ENeonFlag();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.error(message);
        process.exit(1);
    }
}

if (require.main === module) {
    runCli();
}

export {
    REFUSAL_MESSAGE,
    REQUIRED_NEON_FLAG,
    isNeonPatchAcknowledged,
    requireE2ENeonFlag,
    runCli
};
