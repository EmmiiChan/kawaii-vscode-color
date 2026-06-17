const {
    assertCommandAvailable,
    SETTINGS_COMMAND_LABEL,
    waitForWorkbench
} = require("./helpers/extester-app");

describe("VS Code E2E launcher", function () {
    this.timeout(120000);

    it("opens VS Code with the development extension command available", async function () {
        await waitForWorkbench();
        await assertCommandAvailable(SETTINGS_COMMAND_LABEL);
    });
});
