if (process.env.KAWAII_E2E_ALLOW_NEON_PATCH !== "1") {
    console.error("Refusing to run real Neon Effect E2E. Set KAWAII_E2E_ALLOW_NEON_PATCH=1 to acknowledge the patch risk.");
    process.exit(1);
}
