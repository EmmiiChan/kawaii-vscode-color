# Modular Effects Patches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current monolithic Neon Effect patch into a modular Effects stack with independently selectable Foundation / Runtime Layer, Editor Background, No-Page Logo, and Glow Effects modules.

**Architecture:** Keep the existing workbench wrapper and bounded renderer lifecycle. Add a small effect-module contract that controls which runtime classes, CSS fragments, assets, and glow rules are emitted during Apply. The Apply path must clean the previous generated stack first, then write the new selected stack through the existing workbench patch boundary.

**Tech Stack:** VS Code extension host, TypeScript services/controllers, existing settings webview HTML/JS, Sass-generated workbench CSS, Node test runner, jsdom, ExTester gated E2E.

---

## Required Safety Baseline

- Keep safe E2E safe: `npm run test:e2e` must not click real Apply/Enable/Disable patch actions.
- Keep destructive/disposable patch validation gated: `KAWAII_E2E_ALLOW_NEON_PATCH=1 npm run test:e2e:neon`.
- Keep cleanup diagnostics: `npm run test:cleanup-diagnostics` and generated asset deletion checks.
- Keep renderer performance limits: bounded bootstrap observer, narrow post-bootstrap observers, no polling loops, no broad permanent DOM rescans.
- Keep legacy cleanup support for old `neondreams.js` markers, but replace user-facing `Neon Dreams` wording with `Kawaii Neon`.

## File Structure

- Modify `src/shared/models/effects.ts`: effect feature ids, default settings, normalization helpers.
- Modify `src/shared/models/settings.ts`: include effect feature settings in app state.
- Modify `src/shared/contracts/webviewMessages.ts`: structured Effects messages and compatibility aliases.
- Modify `src/settings.ts`: message handlers, persisted effect settings, Apply orchestration, status posting.
- Modify `src/settingsWebview.ts`: rename `Neon Effect` to `Effects`, switches, status panel, dedupe behavior.
- Modify `src/extensionHost/controllers/NeonEffectController.ts`: pass selected stack configuration through existing single-flight behavior.
- Modify `src/extensionHost/services/NeonEffectService.ts`: build selected patch modules and apply/remove stack.
- Optionally create `src/extensionHost/services/EffectPatchStackService.ts`: pure module assembly helper if `NeonEffectService.ts` becomes too large.
- Modify `src/shared/contracts/rendererPlaceholders.ts`: placeholders for selected effect ids/classes.
- Modify `src/js/theme_template.js`: root wrapper module classes and glow gating.
- Modify `src/renderer/ThemeTemplate.ts`: typed mirror of renderer constants/helpers.
- Modify `src/scss/kawaii-vscode-colors-ui.scss` and source CSS/partials as needed: class-gated CSS modules.
- Update tests under `test/unit`, `test/dom`, and gated `test/e2e` after unit/DOM behavior is stable.
- Update `README.md`, `CHANGELOG.md`, and `.codex` docs.

## Feature Module Contract

Use these ids consistently:

```ts
export const EFFECT_FEATURE_IDS = [
  "foundation",
  "editorBackground",
  "noPageLogo",
  "glow"
] as const;

export type EffectFeatureId = typeof EFFECT_FEATURE_IDS[number];

export interface EffectFeatureSettings {
  readonly foundation: boolean;
  readonly editorBackground: boolean;
  readonly noPageLogo: boolean;
  readonly glow: boolean;
}

export const DEFAULT_EFFECT_FEATURE_SETTINGS: EffectFeatureSettings = {
  foundation: true,
  editorBackground: true,
  noPageLogo: true,
  glow: true
};
```

Foundation rule:

- Foundation enabled alone applies the wrapper/runtime layer without visual modules.
- Any enabled visual module requires Foundation at write time.
- If Foundation is disabled in the UI, Apply removes the generated workbench patch and generated assets instead of applying visual modules.

## Task 1: Shared Contracts and Compatibility

**Files:**
- Modify: `src/shared/models/effects.ts`
- Modify: `src/shared/models/settings.ts`
- Modify: `src/shared/contracts/webviewMessages.ts`
- Test: `test/unit/shared-contracts.test.ts`
- Test: `test/unit/webview-message-contract-parity.test.ts`

- [ ] **Step 1: Write failing tests for default effect feature settings**

Add tests that assert missing or partial values normalize to all `true`.

```ts
assert.deepEqual(normalizeEffectFeatureSettings(undefined), {
  foundation: true,
  editorBackground: true,
  noPageLogo: true,
  glow: true
});

assert.deepEqual(normalizeEffectFeatureSettings({ glow: false }), {
  foundation: true,
  editorBackground: true,
  noPageLogo: true,
  glow: false
});
```

- [ ] **Step 2: Add model implementation**

Add the feature ids, default settings, and normalizer to `src/shared/models/effects.ts`.

```ts
export function normalizeEffectFeatureSettings(value: unknown): EffectFeatureSettings {
  const candidate = isRecord(value) ? value : {};

  return {
    foundation: candidate.foundation !== false,
    editorBackground: candidate.editorBackground !== false,
    noPageLogo: candidate.noPageLogo !== false,
    glow: candidate.glow !== false
  };
}
```

Import or add a local `isRecord` helper consistently with existing shared model patterns.

- [ ] **Step 3: Extend settings state**

Add the field to `EffectsState`.

```ts
export interface EffectsState {
  readonly editorBackgroundOpacity: OpacityValue;
  readonly emptyEditorLogoOpacity: OpacityValue;
  readonly editorBackgroundFit: EditorBackgroundFit;
  readonly features: EffectFeatureSettings;
}
```

- [ ] **Step 4: Add structured messages**

Add new message contracts while keeping existing aliases until all call sites are migrated.

```ts
export type EffectsStatusTone = "info" | "success" | "warning" | "error" | "busy";

export type WebviewToHostMessage =
  | { readonly type: "apply-effects"; readonly features: EffectFeatureSettings; readonly editorBackgroundFit: EditorBackgroundFit; readonly editorBackgroundOpacity: OpacityValue; readonly emptyEditorLogoOpacity: OpacityValue }
  | { readonly type: "update-effect-features"; readonly features: EffectFeatureSettings }
  | { readonly type: "enable-neon" }
  | { readonly type: "disable-neon" }
  | { readonly type: "apply-neon-customizations"; readonly editorBackgroundFit: EditorBackgroundFit; readonly editorBackgroundOpacity: OpacityValue; readonly emptyEditorLogoOpacity: OpacityValue };

export type HostToWebviewMessage =
  | { readonly type: "effects-status"; readonly tone: EffectsStatusTone; readonly title: string; readonly message: string; readonly dedupeKey?: string }
  | { readonly type: "effects-pending"; readonly message?: string }
  | { readonly type: "neon-status"; readonly message?: string; readonly enabled?: boolean };
```

- [ ] **Step 5: Run focused contract tests**

Run:

```powershell
npm run compile
node --test out-tests/test/unit/shared-contracts.test.js out-tests/test/unit/webview-message-contract-parity.test.js
```

Expected: tests pass after implementation.

## Task 2: Modular Patch Stack

**Files:**
- Modify: `src/extensionHost/services/NeonEffectService.ts`
- Optionally create: `src/extensionHost/services/EffectPatchStackService.ts`
- Modify: `src/extensionHost/controllers/NeonEffectController.ts`
- Modify: `src/shared/contracts/rendererPlaceholders.ts`
- Modify: `src/js/theme_template.js`
- Modify: `src/renderer/ThemeTemplate.ts`
- Modify: `src/scss/kawaii-vscode-colors-ui.scss`
- Test: `test/unit/neon-effect-service.test.ts`
- Test: `test/unit/neon-effect-controller.test.ts`
- Test: `test/unit/renderer-theme-template.test.ts`
- Test: `test/unit/renderer-theme-template-runtime.test.js`

- [ ] **Step 1: Write failing service tests for each module combination**

Cover these cases:

- Foundation only writes JS/CSS and root wrapper classes, but no background image asset, no no-page logo CSS, and no token glow.
- Foundation + Editor Background writes only background CSS variables/assets.
- Foundation + No-Page Logo writes only logo CSS/assets.
- Foundation + Glow enables token glow and glow/chrome CSS classes.
- Foundation disabled removes the patch and deletes generated assets.

- [ ] **Step 2: Add patch module assembly**

Use a pure helper when possible.

```ts
export interface EffectPatchModule {
  readonly id: EffectFeatureId;
  readonly rootClass: string;
  readonly placeholders: RendererPlaceholderValues;
  readonly imageAssets: readonly WorkbenchPatchBinaryAsset[];
  readonly deleteAssetFileNames: readonly string[];
}

export interface EffectPatchStack {
  readonly enabledFeatureIds: readonly EffectFeatureId[];
  readonly rootClasses: readonly string[];
  readonly placeholders: RendererPlaceholderValues;
  readonly imageAssets: readonly WorkbenchPatchBinaryAsset[];
  readonly deleteAssetFileNames: readonly string[];
}
```

- [ ] **Step 3: Apply by selected stack**

Replace the current all-or-nothing assembly with:

```ts
const stack = buildEffectPatchStack({
  features: normalizeEffectFeatureSettings(configuration.features),
  storage: this.dependencies.storage,
  fileSystem: this.dependencies.fileSystem,
  logger: this.dependencies.logger
});

if (!stack.features.foundation) {
  await this.disable();
  return;
}
```

Then write `scriptContent`, `styleContent`, `imageAssets`, and `deleteAssetFileNames` from the stack.

- [ ] **Step 4: Preserve cleanup and replacement behavior**

Do not bypass `WorkbenchPatchService.applyAssets`. It already replaces the script tag, writes the generated files, and deletes stale image variants.

Ensure `deleteAssetFileNames` includes all known module asset names so toggling a feature off removes its previous generated files.

- [ ] **Step 5: Gate renderer root classes**

Add a placeholder such as `[EFFECT_ROOT_CLASSES]` or `[ENABLED_EFFECT_IDS]`.

```js
const enabledEffectClasses = "[EFFECT_ROOT_CLASSES]".split(" ").filter(Boolean);

const syncUiRootClass = () => {
  const root = getHighestWorkbenchRoot();
  const activeInnerTheme = getActiveInnerTheme();

  if (!root) {
    return null;
  }

  root.classList.remove("kawaii-effect-foundation", "kawaii-effect-editor-background", "kawaii-effect-no-page-logo", "kawaii-effect-glow");

  if (!activeInnerTheme) {
    root.classList.remove(UI_ROOT_CLASS);
    return null;
  }

  root.classList.add(UI_ROOT_CLASS, activeInnerTheme.wrapperClass, ...enabledEffectClasses);
  return activeInnerTheme;
};
```

- [ ] **Step 6: Gate glow rules**

Replace `!disableGlow` with a combined runtime check:

```js
const glowEnabled = !disableGlow && enabledEffectClasses.includes("kawaii-effect-glow");
const updatedThemeStyles = glowEnabled
  ? createScopedTokenRules(initialThemeStyles, orderedTokenReplacements, activeInnerTheme)
  : "";
```

- [ ] **Step 7: Split or gate Sass selectors**

Preferred minimal approach: keep one generated stylesheet, but gate selectors by root classes:

- Foundation: `.kawaii-vscode-colors-ui.kawaii-effect-foundation`
- Editor Background: `.kawaii-vscode-colors-ui.kawaii-effect-editor-background`
- No-Page Logo: generated dynamic CSS from `createEmptyEditorLogoStyles` must include `.kawaii-effect-no-page-logo`
- Glow Effects: `.kawaii-vscode-colors-ui.kawaii-effect-glow`

Do not duplicate full selectors by hand if a small Sass mixin split is cleaner.

- [ ] **Step 8: Run focused patch tests**

Run:

```powershell
npm run compile
npm run compile:tests
node --test out-tests/test/unit/neon-effect-service.test.js out-tests/test/unit/neon-effect-controller.test.js out-tests/test/unit/renderer-theme-template.test.js test/unit/renderer-theme-template-runtime.test.js
```

Expected: selected modules only emit their own classes/assets and cleanup still deletes stale generated files.

## Task 3: Effects Settings UI and Message Quality

**Files:**
- Modify: `src/settingsWebview.ts`
- Modify: `src/settings.ts`
- Modify: `src/extensionHost/services/SettingsEffectsService.ts`
- Test: `test/dom/settings-webview.effects.test.js`
- Test: `test/unit/settings-message-controller.test.ts`
- Test: `test/unit/settings-message-persistence.test.js`

- [ ] **Step 1: Write failing DOM tests for the renamed page**

Expected UI:

- nav button text: `Effects`
- page heading: `Effects`
- no visible `Neon Effect` label in the settings UI
- switches: Foundation / Runtime Layer, Editor Background, No-Page Logo, Glow Effects

- [ ] **Step 2: Replace visible labels**

In `src/settingsWebview.ts`, keep ids stable only if needed by tests during migration, but change displayed text:

```html
<button class="nav-button" data-page="effects" type="button">Effects</button>
```

Use an alias during migration if necessary:

```js
const pages = {
  effects: document.getElementById("effects-page"),
  "neon-effect": document.getElementById("effects-page")
};
```

- [ ] **Step 3: Add switches**

Use checkboxes/toggles because these are binary settings.

```html
<label class="effect-switch">
  <input id="effect-foundation" type="checkbox" checked>
  <span>Foundation / Runtime Layer</span>
</label>
```

Repeat for `effect-editor-background`, `effect-no-page-logo`, and `effect-glow`.

- [ ] **Step 4: Post selected stack on Apply**

Update Apply to send the selected features.

```js
function getSelectedEffectFeatures() {
  return {
    foundation: document.getElementById("effect-foundation").checked,
    editorBackground: document.getElementById("effect-editor-background").checked,
    noPageLogo: document.getElementById("effect-no-page-logo").checked,
    glow: document.getElementById("effect-glow").checked
  };
}

function applyEffects() {
  clearImageCustomizationUpdateTimers();
  vscode.postMessage({
    type: "apply-effects",
    features: getSelectedEffectFeatures(),
    editorBackgroundOpacity: editorBackgroundOpacity.value,
    editorBackgroundFit: editorBackgroundFit.value,
    emptyEditorLogoOpacity: emptyEditorLogoOpacity.value
  });
}
```

- [ ] **Step 5: Improve message style**

Replace competing `status`, `neon-status`, and repeated warning visibility with one structured status renderer.

```js
let lastEffectsStatusKey = "";

function showEffectsStatus(message) {
  const dedupeKey = message.dedupeKey || `${message.tone}:${message.title}:${message.message}`;

  if (dedupeKey === lastEffectsStatusKey) {
    return;
  }

  lastEffectsStatusKey = dedupeKey;
  effectsStatus.className = `effects-status effects-status-${message.tone || "info"}`;
  effectsStatus.querySelector(".effects-status-title").textContent = message.title || "Effects";
  effectsStatus.querySelector(".effects-status-message").textContent = message.message || "";
  effectsStatus.classList.remove("hidden");
}
```

Rules:

- Important warnings stay visible in one predictable panel.
- Repeated identical messages do not stack or flash.
- Pending image changes use one banner near Apply.
- Apply progress uses `busy`, success uses `success`, permission/workbench failures use `error`.

- [ ] **Step 6: Persist switches**

Add storage keys through existing settings/effects persistence rather than package theme files.

Recommended key:

```ts
const EFFECT_FEATURE_SETTINGS_STATE_KEY = "kawaii_synthwave.effectFeatureSettings";
```

Include it in settings export/import so synced bundles preserve module toggles.

- [ ] **Step 7: Run focused UI tests**

Run:

```powershell
npm run compile
node --test test/dom/settings-webview.effects.test.js
npm run compile:tests
node --test out-tests/test/unit/settings-message-controller.test.js test/unit/settings-message-persistence.test.js
```

Expected: UI posts `apply-effects` with selected features, old aliases remain accepted, status panel dedupes repeated messages.

## Task 4: Naming Migration

**Files:**
- Modify: `README.md`
- Modify: `.codex/structure.md`
- Modify: `.codex/system-map.md`
- Modify: tests that assert visible copy
- Modify: comments/strings in source where user-facing or current behavior names should change

- [ ] **Step 1: Replace user-facing `Neon Effect` with `Effects`**

Do this in README, Settings UI visible labels, status messages, and docs.

- [ ] **Step 2: Replace user-facing `Neon Dreams` with `Kawaii Neon`**

Do not remove legacy cleanup patterns that target `neondreams.js` or `<!-- NEON DREAMS -->`; those are compatibility cleanup hooks.

For tests, rename test descriptions from:

```ts
test("applyWorkbenchPatchScriptTag replaces a legacy Neon Dreams marker", () => {
```

to:

```ts
test("applyWorkbenchPatchScriptTag replaces a legacy Kawaii Neon marker", () => {
```

but keep assertions that old `neondreams.js` references are removed.

- [ ] **Step 3: Decide internal rename scope**

Recommended for this sequence: keep TypeScript class/file names such as `NeonEffectService` for one compatibility release, and migrate user-facing text plus new `Effects` contracts first. A full file rename can be a later mechanical cleanup after modular behavior is stable.

Trade-off: fewer risky imports now, but internal names remain historically inconsistent for one cycle.

## Task 5: Documentation and Validation

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `.codex/AGENTS.md`
- Modify: `.codex/docs.md`
- Modify: `.codex/structure.md`
- Modify: `.codex/system-map.md`
- Modify: `.codex/change-impact.md`

- [ ] **Step 1: Update README**

Document:

- Settings tab is `Effects`.
- Default module switches are on.
- Apply cleans previous generated modifications and applies the selected stack.
- Foundation disabled means remove generated patch stack.
- Gated real patch tests remain separate.

- [ ] **Step 2: Update Codex docs**

Update `.codex/system-map.md` and `.codex/structure.md` with:

- Effect feature ids.
- Runtime root classes.
- Structured message types.
- Patch apply/cleanup flow.
- Test matrix updates.

- [ ] **Step 3: Run docs guard**

Run:

```powershell
npm run test:docs
```

Expected:

```text
Codex documentation is aligned with project facts.
```

- [ ] **Step 4: Run full safe validation**

Run:

```powershell
npm run type-check
npm run test:check
npm run test:unit
npm run test:dom
npm run test:cleanup-diagnostics
```

Expected: all pass; diagnostics report no unsafe primary VS Code process termination.

- [ ] **Step 5: Run gated disposable E2E only when ready**

Run only after unit/DOM/safe gates pass:

```powershell
$env:KAWAII_E2E_ALLOW_NEON_PATCH = "1"
npm run test:e2e:neon
```

Expected: disposable `.vscode-test/extest-111-neon` patch lifecycle passes, all 16 Effects switch combinations have before/after screenshots plus generated HTML/JS/CSS/assets and runtime module-class validation in `test-results/e2e/neon-effects-combination-matrix.json`, generated assets are deleted after disable, and HTML restoration checks remain green.

## Self-Review

Spec coverage:

- Foundation / Runtime Layer: Task 1 and Task 2.
- Editor Background: Task 2 and Task 3.
- No-Page Logo: Task 2 and Task 3.
- Glow Effects: Task 2 and renderer gating.
- Rename `Neon Effect` to `Effects`: Task 3 and Task 4.
- `Neon Dreams` to `Kawaii Neon`: Task 4, with legacy cleanup preserved.
- Better messages: Task 3 structured status panel.
- Switches with default true: Task 1 and Task 3.
- Apply cleans previous modifications and applies selected stack: Task 2 and Task 3.
- All possible Effects switch combinations are validated with before/after screenshots and runtime/file-state evidence: Task 5.
- Safety and validation preserved: Required Safety Baseline and Task 5.

Placeholder scan:

- No implementation task depends on undefined ids without defining them first.
- Legacy aliases are explicit, not open-ended.

Type consistency:

- `EffectFeatureId`, `EffectFeatureSettings`, `EffectsState.features`, `apply-effects`, and `effects-status` are introduced before downstream tasks use them.
