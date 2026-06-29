# Step 05 Analysis: Scope Static CSS

## Required Scoping

Every static selector that changes VS Code workbench UI should compile under:

```css
.kawaii-vscode-colors-ui ...
```

Root state selectors should compile as:

```css
.kawaii-vscode-colors-ui[class~="vs-dark"]...
```

not:

```css
.kawaii-vscode-colors-ui [class~="vs-dark"]...
```

## Empty Logo Special Case

`EMPTY_EDITOR_LOGO_STYLES` is generated dynamically by TypeScript, not Sass. It must be prefixed in `src/emptyEditorLogoStyles.ts` before placeholder replacement.

Correct shape:

```css
.kawaii-vscode-colors-ui .letterpress {
  background-image: url("...");
}
```

## Generated Bridge Limit

The generated bridge is a transition tool. It should not become an expanding CSS parser. If a selector cannot be transformed safely, move that block into a hand-authored Sass partial.

## Risk Analysis

- Over-scoping can break rules that need to apply to the root element itself.
- Under-scoping leaves direct overrides and fails the additive goal.
- `!important` declarations may still be needed for VS Code internals, but they must be inside the wrapper scope.
