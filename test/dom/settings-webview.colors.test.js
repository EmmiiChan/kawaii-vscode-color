const assert = require("node:assert/strict");
const test = require("node:test");

const {
  clearPostedMessages,
  click,
  expectNoPostedMessage,
  expectPostedMessage,
  flushTimers,
  renderWebview,
  setInputValue,
  setSelectValue
} = require("./settings-webview-helper");

function getColorRowByLabel(document, label) {
  const row = Array.from(document.querySelectorAll("#content .row")).find((item) => {
    const rowLabel = item.querySelector(".label");
    return rowLabel && rowLabel.textContent.trim() === label;
  });

  assert.ok(row, `Expected to find color row "${label}"`);
  return row;
}

function setElementInputValue(window, input, value) {
  input.value = value;
  input.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
}

test("settings webview filters color rows and shows empty state", async () => {
  const { document, window } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  setInputValue(window, "#search", "editor.background");

  assert.ok(getColorRowByLabel(document, "editor.background"));
  assert.doesNotMatch(document.getElementById("content").textContent, /activityBar\.background/);

  setInputValue(window, "#search", "not-a-real-color-entry");

  assert.match(document.getElementById("content").textContent, /No matching colors/);
});

test("settings webview switches workbench and syntax sections", async () => {
  const { document } = await renderWebview();

  click(document, '[data-page="color-settings"]');

  assert.ok(getColorRowByLabel(document, "editor.background"));
  assert.ok(getColorRowByLabel(document, "activityBar.background"));

  click(document, '[data-section="token"]');

  assert.match(document.getElementById("content").textContent, /Syntax Tokens/);
  assert.ok(getColorRowByLabel(document, "Keyword"));
  assert.ok(getColorRowByLabel(document, "String"));
});

test("settings webview validates hex input before posting color updates", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  clearPostedMessages(postedMessages);

  const row = getColorRowByLabel(document, "editor.background");
  const input = row.querySelector(".hex");

  setElementInputValue(window, input, "not-a-color");
  await flushTimers();

  assert.equal(input.classList.contains("invalid"), true);
  assert.match(document.getElementById("status").textContent, /Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA\./);
  expectNoPostedMessage(postedMessages, "update-color");

  for (const value of ["#123", "#1234", "#123456", "#12345678"]) {
    clearPostedMessages(postedMessages);
    setElementInputValue(window, input, value);
    await flushTimers();

    assert.equal(input.classList.contains("invalid"), false);
    expectPostedMessage(postedMessages, "update-color", {
      section: "workbench",
      id: "editor.background",
      value,
      themeVariantId: "dark"
    });
  }
});

test("settings webview posts color picker updates and preserves alpha", async () => {
  const { document, window, postedMessages } = await renderWebview({
    workbenchColors: [
      {
        id: "editor.background",
        label: "editor.background",
        group: "Editor",
        defaultValue: "#112233",
        value: "#112233cc",
        description: "Editor background",
        customized: true
      }
    ]
  });

  click(document, '[data-page="color-settings"]');
  clearPostedMessages(postedMessages);

  const row = getColorRowByLabel(document, "editor.background");
  const picker = row.querySelector(".picker");
  const input = row.querySelector(".hex");

  picker.value = "#445566";
  picker.dispatchEvent(new window.InputEvent("input", { bubbles: true, inputType: "insertText", data: "#445566" }));

  assert.equal(input.value, "#445566cc");

  await flushTimers();

  expectPostedMessage(postedMessages, "update-color", {
    value: "#445566cc",
    id: "editor.background"
  });
});

test("settings webview posts reset color, refresh, and reset all", async () => {
  const { document, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  clearPostedMessages(postedMessages);

  const row = getColorRowByLabel(document, "activityBar.background");
  const reset = row.querySelector(".reset");

  assert.equal(reset.disabled, false);
  reset.click();

  expectPostedMessage(postedMessages, "reset-color", {
    section: "workbench",
    id: "activityBar.background",
    themeVariantId: "dark"
  });

  click(document, "#refresh");
  expectPostedMessage(postedMessages, "refresh");
  assert.match(document.getElementById("status").textContent, /Refreshing/);

  click(document, "#reset-all");

  expectPostedMessage(postedMessages, "reset-all", {
    themeVariantId: "dark"
  });
});

test("settings webview posts theme variant changes", async () => {
  const { window, postedMessages } = await renderWebview();

  setSelectValue(window, "#theme-variant", "light");

  expectPostedMessage(postedMessages, "change-theme-variant", {
    themeVariantId: "light"
  });
});

test("settings webview clears pending color updates before sync", async () => {
  const { document, window, postedMessages } = await renderWebview();

  click(document, '[data-page="color-settings"]');
  clearPostedMessages(postedMessages);

  const row = getColorRowByLabel(document, "editor.background");
  setElementInputValue(window, row.querySelector(".hex"), "#654321");
  click(document, "#save-vssync");

  await flushTimers();

  expectPostedMessage(postedMessages, "save-settings-to-vssync");
  expectNoPostedMessage(postedMessages, "update-color");
});
