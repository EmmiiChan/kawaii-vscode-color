const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

function loadTemplateSource(options = {}) {
  const effectRootClasses = options.effectRootClasses || "kawaii-effect-foundation kawaii-effect-editor-background kawaii-effect-no-page-logo kawaii-effect-glow";

  return fs.readFileSync(path.join(process.cwd(), "src", "js", "theme_template.js"), "utf8")
    .replace(/\[DISABLE_GLOW\]/g, "false")
    .replace(/\[EFFECT_ROOT_CLASSES\]/g, effectRootClasses)
    .replace(/\[NEON_BRIGHTNESS\]/g, "73")
    .replace(/\[KAWAII_UI_STYLE_VERSION\]/g, "runtime-test");
}

function createReadyDom() {
  const dom = new JSDOM(
    '<!doctype html><html><head><style class="vscode-tokens-styles">.mtk1 { color: #fe4450; }</style></head><body class="vs-dark kawaii_synthwave-generated-color-theme-json"></body></html>',
    { runScripts: "outside-only" }
  );

  Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {
    configurable: true,
    get() {
      return this.textContent || "";
    },
    set(value) {
      this.textContent = String(value);
    }
  });

  return dom;
}

function installTrackingMutationObserver(window) {
  const instances = [];

  class TrackingMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      this.observations = [];
      instances.push(this);
    }

    observe(target, options) {
      this.disconnected = false;
      this.observations.push({ target, options: { ...options } });
    }

    disconnect() {
      this.disconnected = true;
    }
  }

  window.MutationObserver = TrackingMutationObserver;
  return instances;
}

test("renderer bootstrap does not leave a broad body subtree observer active after ready startup", () => {
  const dom = createReadyDom();
  const observers = installTrackingMutationObserver(dom.window);
  dom.window.console = { log() {} };

  vm.runInContext(loadTemplateSource(), dom.getInternalVMContext());

  const activeBroadBodyObservers = observers.filter((observer) =>
    !observer.disconnected
    && observer.observations.some((observation) =>
      observation.target === dom.window.document.body
      && observation.options.attributes === true
      && observation.options.childList === true
      && observation.options.subtree === true
    )
  );

  assert.deepEqual(activeBroadBodyObservers, []);
  assert.ok(dom.window.document.querySelector("#kawaii-vscode-colors-ui-stylesheet"));
  assert.equal(dom.window.document.documentElement.classList.contains("kawaii-effect-glow"), true);
  assert.match(
    dom.window.document.querySelector("#kawaii-vscode-colors-ui-token-styles").textContent,
    /\.kawaii-vscode-colors-ui\.kawaii-effect-glow\.dark-pink-kawaii \.mtk1/
  );
});

test("renderer bootstrap skips token glow rules when the glow module class is disabled", () => {
  const dom = createReadyDom();
  installTrackingMutationObserver(dom.window);
  dom.window.console = { log() {} };

  vm.runInContext(loadTemplateSource({
    effectRootClasses: "kawaii-effect-foundation kawaii-effect-editor-background kawaii-effect-no-page-logo"
  }), dom.getInternalVMContext());

  assert.ok(dom.window.document.querySelector("#kawaii-vscode-colors-ui-stylesheet"));
  assert.equal(dom.window.document.documentElement.classList.contains("kawaii-effect-glow"), false);
  assert.equal(dom.window.document.querySelector("#kawaii-vscode-colors-ui-token-styles"), null);
});

test("renderer refreshes scoped token styles through the narrow token observer", () => {
  const dom = createReadyDom();
  const observers = installTrackingMutationObserver(dom.window);
  dom.window.console = { log() {} };
  dom.window.setTimeout = (callback) => {
    callback();
    return 1;
  };
  dom.window.clearTimeout = () => {};

  vm.runInContext(loadTemplateSource(), dom.getInternalVMContext());

  const tokenStyle = dom.window.document.querySelector(".vscode-tokens-styles");
  const tokenObserver = observers.find((observer) =>
    !observer.disconnected
    && observer.observations.some((observation) => observation.target === tokenStyle)
  );

  assert.ok(tokenObserver, "Expected a narrow observer on the active VS Code token style element.");

  tokenStyle.innerText = ".mtk2 { color: #36f9f6; }";
  tokenObserver.callback([{ type: "childList", target: tokenStyle }], tokenObserver);

  const scopedText = dom.window.document.querySelector("#kawaii-vscode-colors-ui-token-styles").textContent;
  assert.match(scopedText, /\.kawaii-vscode-colors-ui\.kawaii-effect-glow\.dark-pink-kawaii \.mtk2/);
  assert.doesNotMatch(scopedText, /\.mtk1/);
});
