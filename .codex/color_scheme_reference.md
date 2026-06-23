# Kawaii VS Code Color Scheme Reference

Dark editable override file: [themes/kawaii_synthwave-color-theme-overrides.json](../themes/kawaii_synthwave-color-theme-overrides.json)

Light editable override file: [themes/kawaii_synthwave-color-theme-light-overrides.json](../themes/kawaii_synthwave-color-theme-light-overrides.json)

Dark protected base file: [themes/kawaii_synthwave-color-theme.json](../themes/kawaii_synthwave-color-theme.json)

Light protected base file: [themes/kawaii_synthwave-color-theme-light.json](../themes/kawaii_synthwave-color-theme-light.json)

Dark generated theme loaded by VS Code: [themes/kawaii_synthwave-generated-color-theme.json](../themes/kawaii_synthwave-generated-color-theme.json)

Light generated theme loaded by VS Code: [themes/kawaii_synthwave-generated-color-theme-light.json](../themes/kawaii_synthwave-generated-color-theme-light.json)

Build script: [scripts/build-color-theme.js](../scripts/build-color-theme.js)

This guide explains how to navigate and change the Kawaii VS Code Color dark and light themes. Treat protected base files as read-only, place Kawaii changes in the matching overrides file, and regenerate the generated themes before testing or packaging.

Runtime note: `src/settings.ts` reads this file to populate Color Settings descriptions. Keep the Workbench and Token table headings stable unless the parser and tests are updated with the documentation change.

## How To Inspect Changes

| Task | Where to look |
| --- | --- |
| Change VS Code chrome, panels, tabs, status bar, terminal, lists, editor UI | Add keys under `colors` in the overrides file, then run `npm run build:theme`. |
| Change source-code syntax colors | Add rules under `tokenColors` in the overrides file, then run `npm run build:theme`. |
| Refresh the VS Code-loaded theme file | Run `npm run build:theme`; this updates the generated theme from base plus overrides. |
| See a workbench color live without packaging | Temporarily use `settings.json` with `workbench.colorCustomizations`. |
| See a token color live without packaging | Temporarily use `settings.json` with `editor.tokenColorCustomizations`. |
| Inspect which token rule applies to code | Run `Developer: Inspect Editor Tokens and Scopes` in VS Code. |
| Test the full extension | Press `F5` to open an Extension Development Host, then select `Dark Pink Kawaii` or `Light Pink-Pastel Kawaii`. |

## Generated Theme File Shape

| Property | Current value | Purpose | Where to see it |
| --- | --- | --- | --- |
| `name` | `Dark Pink Kawaii` / `Light Pink-Pastel Kawaii` | Display names inside the theme picker. | `Preferences: Color Theme`. |
| `type` | `dark` / `light` | Declares the theme as a dark or light color theme. | Affects VS Code theme defaults and contrast expectations. |
| `semanticHighlighting` | `true` | Lets semantic token providers participate in highlighting. | TypeScript or JavaScript after the language server finishes analysis. |
| `semanticTokenColors` | Object | Current generated dark and light themes define semantic token colors after base/override merge. | Languages with semantic token providers. |
| `colors` | Object | Workbench and editor UI colors after overrides replace base keys. | Activity Bar, Side Bar, tabs, editor chrome, terminal, lists. |
| `tokenColors` | Array | TextMate scope color and font-style rules after matching override rules replace base rules, while new rules append. | Source code in editor panes. |

## Workbench And Editor UI Colors

| Property | Current color | Purpose | Example place to see it |
| --- | --- | --- | --- |
| `focusBorder` | `#1f212b` | Border around focused UI controls. | Tab through buttons, inputs, Quick Pick items. |
| `foreground` | `#fffafd` | Default UI text when no component color overrides it. | Settings UI and generic labels. |
| `widget.shadow` | `#341e2c` | Shadow for floating editor widgets. | Find widget, hover widgets. |
| `selection.background` | `#fffafd20` | Selection background in workbench inputs and text areas. | Select text in Settings search or Quick Input. |
| `errorForeground` | `#fe4450` | Default error text color. | Validation errors in settings and inputs. |
| `textLink.activeForeground` | `#ff7edb` | Link color on hover or active state. | Links in Welcome page or extension details. |
| `textLink.foreground` | `#f97e72` | Default link text color. | Links in Markdown preview, Welcome page, extension details. |
| `button.background` | `#7a4667` | Primary button background. | Open Folder button, dialog buttons. |
| `dropdown.background` | `#2e222a` | Dropdown control background. | Settings dropdowns. |
| `dropdown.listBackground` | `#341e2c` | Dropdown list popup background. | Expanded dropdown lists in Settings. |
| `input.background` | `#341e2c` | Text input background. | Search box, Settings search, input fields. |
| `inputOption.activeBorder` | `#ff7edb99` | Border for active input options. | Search toggles like regex or match case. |
| `inputValidation.errorBackground` | `#fe445080` | Input validation error background. | Invalid setting or input validation message. |
| `inputValidation.errorBorder` | `#fe445000` | Input validation error border. | Invalid input popups. |
| `scrollbar.shadow` | `#341e2c` | Scroll shadow near scrollable edges. | Editor, Explorer, panels. |
| `scrollbarSlider.activeBackground` | `#c47fab20` | Scrollbar slider while being clicked. | Drag editor scrollbar. |
| `scrollbarSlider.background` | `#c47fab30` | Default scrollbar slider. | Editor and panel scrollbars. |
| `scrollbarSlider.hoverBackground` | `#c47fab50` | Scrollbar slider on hover. | Hover editor scrollbar. |
| `badge.foreground` | `#fffafd` | Text inside small count badges. | Activity Bar count badges. |
| `badge.background` | `#341e2c` | Badge background. | Problems count, SCM count. |
| `progressBar.background` | `#f97e72` | Progress bar fill color. | Window progress under tabs during long operations. |
| `list.activeSelectionBackground` | `#fffafd20` | Active list selected-row background. | Explorer selected file while Explorer has focus. |
| `list.activeSelectionForeground` | `#fffafd` | Active list selected-row text. | Explorer selected file while focused. |
| `list.dropBackground` | `#46243a66` | List drag-and-drop target background. | Drag a file over Explorer folders. |
| `list.focusBackground` | `#fffafd20` | Focused list item background. | Keyboard focus in Explorer or Quick Pick. |
| `list.focusForeground` | `#fffafd` | Focused list item text. | Keyboard focus in Explorer or Quick Pick. |
| `list.highlightForeground` | `#f97e72` | Highlighted match text in lists. | Search inside Command Palette or Explorer. |
| `list.hoverBackground` | `#46253a99` | List item hover background. | Hover files in Explorer. |
| `list.hoverForeground` | `#fffafd` | List item hover text. | Hover files in Explorer. |
| `list.inactiveSelectionBackground` | `#fffafd20` | Selected item background when list is not focused. | Explorer selected file while editor has focus. |
| `list.inactiveSelectionForeground` | `#fffafd` | Selected item text when list is not focused. | Explorer selected file while editor has focus. |
| `list.inactiveFocusBackground` | `#341e2c99` | Focused item background when focus is inactive. | Tree/list focus after changing focus area. |
| `list.errorForeground` | `#fe4450E6` | Error-colored items in lists. | Problems tree error entries. |
| `list.warningForeground` | `#72f1b8bb` | Warning-colored items in lists. | Problems tree warning entries. |
| `activityBar.background` | `#1e131a` | Activity Bar background. | Far-left icon bar. |
| `activityBar.dropBackground` | `#46243a66` | Activity Bar drag target background. | Drag view icons in Activity Bar. |
| `activityBar.foreground` | `#fffafdCC` | Active Activity Bar icon color. | Selected Explorer/Search/SCM icon. |
| `activityBarBadge.background` | `#f97e72` | Activity Bar badge background. | SCM or Problems count badge. |
| `activityBarBadge.foreground` | `#341e2c` | Activity Bar badge text color. | Number inside SCM badge. |
| `sideBar.background` | `#2c1925` | Side Bar background. | Explorer, Search, Source Control side panel. |
| `sideBar.foreground` | `#fffafd99` | Default Side Bar text color. | Explorer file names and side labels. |
| `sideBar.dropBackground` | `#46243a4c` | Side Bar drag target background. | Drag file or view into Side Bar. |
| `sideBarSectionHeader.background` | `#2c1925` | Section header background in Side Bar. | Explorer section headers like Open Editors. |
| `sideBarSectionHeader.foreground` | `#fffafdca` | Section header text in Side Bar. | Explorer section header labels. |
| `menubar.selectionForeground` | `#fffafd` | Text color for the selected top menu item. | Hover or open File, Edit, Selection in the menu bar. |
| `menubar.selectionBackground` | `#5a2f4aE6` | More opaque pink background for the selected top menu item. | Hover or open File, Edit, Selection in the menu bar. |
| `menubar.selectionBorder` | `#ff7edb80` | Translucent pink border for the selected top menu item. | Active File, Edit, or Selection menu label. |
| `menu.foreground` | `#fffafdF2` | Menu item text color. | Items inside File, Edit, Selection, and context menus. |
| `menu.background` | `#5a2f4aE6` | More opaque pink menu popup background. | Open File, Edit, Selection, or a context menu. |
| `menu.selectionForeground` | `#fffafd` | Selected menu item text color. | Hover an item inside a menu popup. |
| `menu.selectionBackground` | `#ff7edb4D` | Transparent pink selected-item background. | Hover an item inside File, Edit, Selection, or context menus. |
| `menu.selectionBorder` | `#ff7edb99` | Pink border for selected menu items. | Hover an item inside a menu popup. |
| `menu.separatorBackground` | `#ff7edb66` | Separator line color inside menu popups. | Divider lines in File, Edit, or Selection menus. |
| `menu.border` | `#ff7edb80` | Translucent pink border around menu popups. | Outer edge of File, Edit, Selection, or context menus. |
| `editorGroup.border` | `#85416c` | Border between editor groups. | Split editor layout separators. |
| `editorGroup.dropBackground` | `#85416c4a` | Editor group drag target overlay. | Drag editor tab between groups. |
| `editorGroupHeader.tabsBackground` | `#2c1925` | Background behind editor tabs. | Tab strip area. |
| `tab.border` | `#2c192500` | Border around tabs. | Editor tab edges. |
| `tab.activeBorder` | `#880088` | Active tab accent border. | Currently open editor tab. |
| `tab.inactiveBackground` | `#31202b` | Background for inactive tabs. | Non-selected editor tabs. |
| `editor.background` | `#31202b` | Main editor background. | Code editor area. |
| `editorLineNumber.foreground` | `#fffafd73` | Inactive line number color. | Editor gutter line numbers. |
| `editorLineNumber.activeForeground` | `#fffafdcc` | Active line number color. | Current line number in editor gutter. |
| `editorCursor.background` | `#2c1925` | Cursor background for block cursor mode. | Editor cursor when block style applies. |
| `editorCursor.foreground` | `#f97e72` | Editor cursor color. | Text caret in code editor. |
| `editor.selectionBackground` | `#fffafd20` | Editor selected text background. | Select text in a source file. |
| `editor.selectionHighlightBackground` | `#fffafd20` | Background for other occurrences of selected text. | Select a word and view matching occurrences. |
| `editor.wordHighlightBackground` | `#46243a88` | Read-access word highlight background. | Cursor on a symbol in editor. |
| `editor.wordHighlightStrongBackground` | `#46243a88` | Write-access word highlight background. | Cursor on assigned symbol in editor. |
| `editor.findMatchBackground` | `#D18616bb` | Current find match background. | `Ctrl+F` current result. |
| `editor.findMatchHighlightBackground` | `#D1861655` | Other find matches background. | `Ctrl+F` non-current results. |
| `editor.findRangeHighlightBackground` | `#46243a1a` | Find range highlight. | Find inside selected range. |
| `editor.hoverHighlightBackground` | `#5a304b` | Symbol highlight shown by hover. | Hover a symbol with references. |
| `editor.lineHighlightBorder` | `#7059AB66` | Border around current line highlight. | Active line in editor. |
| `editor.rangeHighlightBackground` | `#85416c39` | Generic range highlight background. | Quick Open result reveal or symbol ranges. |
| `editorIndentGuide.background` | `#4e4049` | Inactive indentation guide color. | Indent guides in editor. |
| `editorIndentGuide.activeBackground` | `#ac488780` | Active indentation guide color. | Indent guide for current block. |
| `editorRuler.foreground` | `#A148AB80` | Vertical ruler color. | Editor ruler at configured columns. |
| `editorCodeLens.foreground` | `#fffafd7c` | CodeLens text color. | References or test CodeLens above code. |
| `editorBracketMatch.background` | `#46243a66` | Matched bracket background. | Cursor beside a bracket. |
| `editorBracketMatch.border` | `#85416c` | Matched bracket border. | Cursor beside a bracket. |
| `editorOverviewRuler.border` | `#46243ab3` | Border of overview ruler. | Right-side editor overview ruler. |
| `editorOverviewRuler.findMatchForeground` | `#D1861699` | Find markers in overview ruler. | Right-side markers after `Ctrl+F`. |
| `editorOverviewRuler.modifiedForeground` | `#b893ce99` | Modified-line markers in overview ruler. | Git changed files in editor. |
| `editorOverviewRuler.addedForeground` | `#09f7a099` | Added-line markers in overview ruler. | Git added lines in editor. |
| `editorOverviewRuler.deletedForeground` | `#fe445099` | Deleted-line markers in overview ruler. | Git deleted lines in editor. |
| `editorOverviewRuler.errorForeground` | `#fe4450dd` | Error markers in overview ruler. | Type or lint errors. |
| `editorOverviewRuler.warningForeground` | `#72f1b8cc` | Warning markers in overview ruler. | Type or lint warnings. |
| `editorError.foreground` | `#fe4450` | Error squiggle color. | Invalid code diagnostics. |
| `editorWarning.foreground` | `#72f1b8cc` | Warning squiggle color. | Warning diagnostics. |
| `editorGutter.modifiedBackground` | `#b893ce8f` | Modified-line gutter marker. | Git modified line in editor gutter. |
| `editorGutter.addedBackground` | `#206d4bd6` | Added-line gutter marker. | Git added line in editor gutter. |
| `editorGutter.deletedBackground` | `#fa2e46a4` | Deleted-line gutter marker. | Git deleted line in editor gutter. |
| `diffEditor.insertedTextBackground` | `#0beb9935` | Inserted text background in diff view. | Compare changes, left/right diff editor. |
| `diffEditor.removedTextBackground` | `#fe445035` | Removed text background in diff view. | Compare changes, left/right diff editor. |
| `editorWidget.background` | `#1e131aDC` | Floating editor widget background. | Find, suggest, rename, hover widgets. |
| `editorWidget.border` | `#fffafd22` | Floating editor widget border. | Find or rename widget border. |
| `editorWidget.resizeBorder` | `#fffafd44` | Resize handle border for widgets. | Resizable peek or find widgets. |
| `editorSuggestWidget.highlightForeground` | `#f97e72` | Highlighted match text in suggestions. | IntelliSense filtered text. |
| `editorSuggestWidget.selectedBackground` | `#fffafd36` | Selected suggestion background. | Active IntelliSense item. |
| `peekView.border` | `#85416c` | Peek view border. | Peek Definition or Peek References. |
| `peekViewEditor.background` | `#2e222a` | Peek editor background. | Code editor inside Peek References. |
| `peekViewEditor.matchHighlightBackground` | `#D18616bb` | Match highlight inside peek editor. | Highlighted reference in peek editor. |
| `peekViewResult.background` | `#2e222a` | Peek results list background. | Left list in Peek References. |
| `peekViewResult.matchHighlightBackground` | `#D1861655` | Match highlight in peek result list. | Highlighted text in peek results. |
| `peekViewResult.selectionBackground` | `#341e2c80` | Selected peek result background. | Selected file or symbol in peek results. |
| `peekViewTitle.background` | `#2e222a` | Peek title bar background. | Header of Peek References panel. |
| `panelTitle.activeBorder` | `#f97e72` | Active panel title underline. | Terminal, Problems, Output panel tabs. |
| `statusBar.background` | `#2c1925` | Status Bar background. | Bottom bar. |
| `statusBar.foreground` | `#fffafd80` | Status Bar text color. | Branch, line, encoding, language mode. |
| `statusBar.debuggingBackground` | `#f97e72` | Status Bar background while debugging. | Start a debug session. |
| `statusBar.debuggingForeground` | `#08080f` | Status Bar text while debugging. | Debug session bottom bar. |
| `statusBar.noFolderBackground` | `#2c1925` | Status Bar background with no folder open. | Empty VS Code window. |
| `statusBarItem.prominentBackground` | `#341e2c` | Prominent Status Bar item background. | Important status bar items. |
| `statusBarItem.prominentHoverBackground` | `#46243a` | Prominent Status Bar item hover background. | Hover prominent status items. |
| `titleBar.activeBackground` | `#2c1925` | Active window title bar background. | Custom title bar when VS Code is focused. |
| `titleBar.inactiveBackground` | `#2c1925` | Inactive window title bar background. | Custom title bar when VS Code loses focus. |
| `extensionButton.prominentBackground` | `#f97e72` | Prominent extension button background. | Install or Enable button in Extensions view. |
| `extensionButton.prominentHoverBackground` | `#ff7edb` | Prominent extension button hover background. | Hover Install or Enable in Extensions view. |
| `pickerGroup.foreground` | `#f97e72ea` | Group label color in Quick Pick. | Command Palette grouped results. |
| `terminal.foreground` | `#fffafd` | Default terminal text color. | Integrated Terminal. |
| `terminal.ansiBlue` | `#03edf9` | ANSI blue terminal color. | `ls`, CLIs, shell output using ANSI blue. |
| `terminal.ansiBrightBlue` | `#03edf9` | Bright ANSI blue terminal color. | CLI output using bright blue. |
| `terminal.ansiBrightCyan` | `#03edf9` | Bright ANSI cyan terminal color. | CLI output using bright cyan. |
| `terminal.ansiBrightGreen` | `#72f1b8` | Bright ANSI green terminal color. | Success output in many CLIs. |
| `terminal.ansiBrightMagenta` | `#ff7edb` | Bright ANSI magenta terminal color. | CLI output using bright magenta. |
| `terminal.ansiBrightRed` | `#fe4450` | Bright ANSI red terminal color. | Error output in many CLIs. |
| `terminal.ansiBrightYellow` | `#fede5d` | Bright ANSI yellow terminal color. | Warning output in many CLIs. |
| `terminal.ansiCyan` | `#03edf9` | ANSI cyan terminal color. | CLI output using cyan. |
| `terminal.ansiGreen` | `#72f1b8` | ANSI green terminal color. | Success output in many CLIs. |
| `terminal.ansiMagenta` | `#ff7edb` | ANSI magenta terminal color. | CLI output using magenta. |
| `terminal.ansiRed` | `#fe4450` | ANSI red terminal color. | Error output in many CLIs. |
| `terminal.ansiYellow` | `#f3e70f` | ANSI yellow terminal color. | Warning output in many CLIs. |
| `terminal.selectionBackground` | `#fffafd20` | Terminal selection background. | Select text in Integrated Terminal. |
| `terminalCursor.background` | `#fffafd` | Terminal cursor background for block cursor. | Terminal block cursor. |
| `terminalCursor.foreground` | `#03edf9` | Terminal cursor foreground. | Terminal caret. |
| `debugToolBar.background` | `#5a2f4a` | Debug toolbar background. | Floating debug controls during debugging. |
| `walkThrough.embeddedEditorBackground` | `#2e222a` | Embedded editor background in walkthroughs. | Welcome walkthrough code snippets. |
| `gitDecoration.modifiedResourceForeground` | `#b893ceee` | Modified file decoration color. | Explorer Git modified files. |
| `gitDecoration.deletedResourceForeground` | `#fe4450` | Deleted file decoration color. | Explorer Git deleted files. |
| `gitDecoration.addedResourceForeground` | `#72f1b8cc` | Added file decoration color. | Explorer Git added files. |
| `gitDecoration.untrackedResourceForeground` | `#72f1b8` | Untracked file decoration color. | Explorer Git untracked files. |
| `gitDecoration.ignoredResourceForeground` | `#fffafd59` | Ignored file decoration color. | Explorer ignored files. |
| `minimapGutter.addedBackground` | `#09f7a099` | Added-line marker in minimap gutter. | Minimap Git added markers. |
| `minimapGutter.modifiedBackground` | `#b893ce` | Modified-line marker in minimap gutter. | Minimap Git modified markers. |
| `minimapGutter.deletedBackground` | `#fe4450` | Deleted-line marker in minimap gutter. | Minimap Git deleted markers. |
| `breadcrumbPicker.background` | `#2e222a` | Breadcrumb picker popup background. | Click editor breadcrumbs at top of editor. |

### Additional Current Workbench Colors

These rows cover color ids currently present in the generated dark or light themes that were missing from the first reference pass.

| Property | Current color | Purpose | Example place to see it |
| --- | --- | --- | --- |
| `activityBar.activeBorder` | `#ff7edb` | Active Activity Bar indicator border. | Selected Explorer/Search/SCM icon indicator. |
| `activityBar.dropBorder` | `#fffafd` | Drag-and-drop feedback border for Activity Bar items. | Drag a view icon over the Activity Bar. |
| `activityBar.inactiveForeground` | `#fffafd66` | Inactive Activity Bar icon color. | Unselected Activity Bar icons. |
| `commandCenter.activeBackground` | `#46253a99` | Command Center background while active. | Title bar Command Center when focused or opened. |
| `commandCenter.activeBorder` | `#ff7edb80` | Command Center border while active. | Focused title bar Command Center. |
| `commandCenter.activeForeground` | `#fffafd` | Command Center text while active. | Active Command Center title/search text. |
| `commandCenter.background` | `#2c1925` | Default Command Center background. | Command Center in the title bar. |
| `commandCenter.border` | `#85416c` | Default Command Center border. | Command Center outline in the title bar. |
| `commandCenter.foreground` | `#fffafd` | Default Command Center text. | Command Center title/search text. |
| `commandCenter.inactiveBorder` | `#85416c80` | Command Center border when the window is inactive. | Command Center after VS Code loses focus. |
| `diffEditor.border` | `#85416c` | Border between diff editor panes. | Side-by-side diff editor split. |
| `diffEditor.diagonalFill` | `#ff7edb33` | Diagonal fill pattern for empty diff areas. | Diff editor blank/unchanged filler area. |
| `diffEditor.insertedLineBackground` | `#72f1b81f` | Inserted line background in diff views. | Added lines in a diff editor. |
| `diffEditor.insertedTextBorder` | `#72f1b800` | Border around inserted text in diff views. | Word-level inserted text in a diff editor. |
| `diffEditor.removedLineBackground` | `#fe44501f` | Removed line background in diff views. | Deleted lines in a diff editor. |
| `diffEditor.removedTextBorder` | `#fe445000` | Border around removed text in diff views. | Word-level removed text in a diff editor. |
| `editor.foreground` | `#fffafd` | Default editor text color before syntax scopes override it. | Plain text or unscoped code in the editor. |
| `editor.inactiveSelectionBackground` | `#fffafd14` | Selection background in an inactive editor. | Selected text after focus moves to another editor. |
| `editor.lineHighlightBackground` | `#3a2734` | Background for the current editor line. | Line containing the text cursor. |
| `editorGroup.emptyBackground` | `#31202b` | Background shown when an editor group has no open tabs. | Close all tabs in an editor group. |
| `editorGroup.focusedEmptyBorder` | `#ff7edb80` | Border around a focused empty editor group. | Focus an editor group with no open tabs. |
| `editorIndentGuide.activeBackground1` | `#ac488780` | First active indentation guide color. | Active indent guide in code. |
| `editorIndentGuide.background1` | `#4e4049` | First inactive indentation guide color. | Indent guides in code. |
| `editorSuggestWidget.background` | `#1e131aDC` | Suggestion widget background. | IntelliSense suggestions popup. |
| `editorWatermark.foreground` | `#fffafd66` | Foreground for labels in the editor watermark. | Empty editor watermark shortcut labels. |
| `input.placeholderForeground` | `#fffafd73` | Placeholder text color in input boxes. | Search boxes or settings inputs before text entry. |
| `list.focusAndSelectionOutline` | `#ff7edb80` | Outline for a focused and selected list item. | Keyboard-focused selected item in Explorer or Quick Pick. |
| `notebook.cellBorderColor` | `#46243a` | Border color for notebook cells. | Jupyter or notebook editor cells. |
| `notebook.focusedCellBackground` | `#341e2c80` | Background for a focused notebook cell. | Active cell in a notebook editor. |
| `notebook.outputContainerBackgroundColor` | `#341e2c80` | Notebook output container background. | Output area below a notebook cell. |
| `panel.background` | `#2c1925` | Panel background. | Terminal, Problems, Output, or Debug Console panel. |
| `panel.border` | `#85416c` | Border separating the panel from the editor. | Top edge of bottom panel. |
| `searchEditor.textInputBorder` | `#85416c` | Border around the Search Editor input. | Search Editor query input. |
| `settings.numberInputBorder` | `#85416c` | Border around number inputs in Settings UI. | Numeric controls in Preferences: Open Settings (UI). |
| `settings.textInputBorder` | `#85416c` | Border around text inputs in Settings UI. | Text controls in Preferences: Open Settings (UI). |
| `sideBarSectionHeader.border` | `#46243a` | Side Bar section header border. | Explorer section header divider. |
| `sideBarTitle.foreground` | `#fffafd99` | Side Bar title text color. | Explorer/Search title text. |
| `statusBar.noFolderForeground` | `#fffafd` | Status Bar text when no folder is open. | Empty VS Code window status bar. |
| `statusBarItem.activeBackground` | `#fffafd2e` | Status Bar item background while clicked. | Click any status bar item. |
| `statusBarItem.errorBackground` | `#fe4450` | Status Bar error item background. | Error-status item in the status bar. |
| `statusBarItem.errorForeground` | `#fffafd` | Status Bar error item text. | Text inside an error-status item. |
| `statusBarItem.hoverBackground` | `#fffafd1f` | Status Bar item background on hover. | Hover branch, line, or language status items. |
| `statusBarItem.prominentForeground` | `#fffafd` | Prominent Status Bar item text. | Prominent status item text. |
| `statusBarItem.remoteBackground` | `#ff7edb` | Remote indicator background. | Remote/SSH/WSL indicator in the Status Bar. |
| `statusBarItem.remoteForeground` | `#341e2c` | Remote indicator text. | Text inside the remote indicator. |
| `tab.activeBackground` | `#e6e9de` | Active tab background. | Selected editor tab. |
| `tab.activeForeground` | `#fffafd` | Active tab text. | Selected editor tab label. |
| `tab.inactiveForeground` | `#fffafd99` | Inactive tab text. | Non-selected editor tab labels. |
| `tab.lastPinnedBorder` | `#85416c80` | Border after the last pinned tab. | Divider between pinned and normal tabs. |
| `tab.unfocusedActiveBackground` | `#e6e9de` | Active tab background in an unfocused editor group. | Active tab after another editor group gets focus. |
| `titleBar.activeForeground` | `#fffafd` | Title Bar text when the window is active. | Window title text while VS Code is focused. |
| `titleBar.inactiveForeground` | `#fffafd80` | Title Bar text when the window is inactive. | Window title text after VS Code loses focus. |
| `walkthrough.stepTitle.foreground` | `#fffafd` | Walkthrough step heading text. | Welcome/Get Started walkthrough step titles. |
| `welcomePage.background` | `#1e131a` | Welcome page background. | Welcome/Get Started page. |
| `welcomePage.progress.background` | `#341e2c` | Welcome page progress bar track. | Walkthrough progress bars. |
| `welcomePage.progress.foreground` | `#ff7edb` | Welcome page progress bar fill. | Walkthrough progress bars. |
| `welcomePage.tileBackground` | `#2e222a` | Welcome page tile background. | Welcome/Get Started cards. |
| `welcomePage.tileBorder` | `#85416c` | Welcome page tile border. | Welcome/Get Started cards. |
| `welcomePage.tileHoverBackground` | `#46253a99` | Welcome page tile hover background. | Hover Welcome/Get Started cards. |

## Syntax Token Colors

| Rule | Scope or property | Current style | Purpose | Example place to see it |
| --- | --- | --- | --- | --- |
| `Comment` | `comment`, Python docstring scopes | `#848bbd`, italic | Comments and Python docstrings. | `// comment`, `# comment`, Python triple-quoted docstrings. |
| `String` | `string.quoted`, `string.template`, `punctuation.definition.string` | `#ff8b39` | Quoted and template strings. | JavaScript `"text"` or template strings. |
| `Punctuation within templates` | `string.template meta.embedded.line` | `#b8b0b4` | Embedded punctuation inside template strings. | JavaScript `${value}` inside template strings. |
| `Variable` | `variable`, `entity.name.variable` | `#ff7edb` | Variables and variable declarations. | JavaScript `const userName = value`. |
| `Language variable` | `variable.language` | `#fe4450`, bold | Built-in language variables. | JavaScript `this`, `super`, Python `self` when scoped by grammar. |
| `Parameter` | `variable.parameter` | italic | Function parameters. | JavaScript `(userName) => userName`. |
| `Storage (declaration or modifier keyword)` | `storage.type`, `storage.modifier` | `#fede5d` | Declaration and modifier keywords. | `class`, `function`, `const`, `public`. |
| `Constant` | `constant` | `#f97e72` | Generic constants. | Constants from language grammars. |
| `Regex` | `string.regexp` | `#f97e72` | Regular expression literals. | JavaScript `/abc/g`. |
| `Number` | `constant.numeric` | `#f97e72` | Numeric literals. | `42`, `3.14`, `0xff`. |
| `Language constant (boolean, null)` | `constant.language` | `#f97e72` | Built-in constants. | `true`, `false`, `null`, `undefined` where scoped as constants. |
| `Character escape` | `constant.character.escape` | `#36f9f6` | Escaped characters inside strings. | `"\n"`, `"\u00A9"`. |
| `Entity` | `entity.name` | `#fe4450` | Named symbols not covered by narrower rules. | Classes, functions, or sections depending on grammar. |
| `HTML or XML tag` | `entity.name.tag` | `#72f1b8` | Tag names. | `<div>`, `<template>`, `<svg>`. |
| `HTML or XML tag brackets` | `punctuation.definition.tag` | `#36f9f6` | Tag angle brackets and tag punctuation. | `<`, `</`, `>` in HTML/XML. |
| `Tag attribute` | `entity.other.attribute-name` | `#fede5d` | Attribute names. | `class`, `id`, `href`. |
| `Tag attribute HTML` | `entity.other.attribute-name.html` | `#fede5d`, italic | HTML attribute names with extra emphasis. | `<button disabled>`. |
| `Class` | `entity.name.type`, `meta.attribute.class.html` | `#fe4450` | Type/class names and HTML class values when scoped that way. | `class UserService`, HTML `class="card"`. |
| `Inherited class` | `entity.other.inherited-class` | `#D50` | Parent or inherited class names. | `class Admin extends User`. |
| `Function` | `entity.name.function`, `variable.function` | `#36f9f6` | Function names and callable variables. | `function renderTheme()`, `renderTheme()`. |
| `JS Export` | `keyword.control.export.js`, `keyword.control.import.js` | `#72f1b8` | JavaScript import/export keywords. | `import`, `export`. |
| `JS Numerics` | `constant.numeric.decimal.js` | `#2EE2FA` | JavaScript decimal numbers. | `const count = 10`. |
| `Keyword` | `keyword` | `#fede5d` | Generic language keywords. | `return`, `if`, `for`, `async`. |
| `Control keyword` | `keyword.control` | `#fede5d` | Flow-control keywords. | `if`, `else`, `switch`, `return`. |
| `Operator` | `keyword.operator` | `#fede5d` | Operators. | `=`, `+`, `===`, `=>`. |
| `Special operator` | `keyword.operator.new`, `keyword.operator.expression`, `keyword.operator.logical` | `#fede5d` | Constructor, expression, and logical operators. | `new`, `typeof`, logical OR. |
| `Unit` | `keyword.other.unit` | `#f97e72` | Unit suffixes. | CSS `px`, `rem`, `%` if scoped as unit. |
| `Support` | `support` | `#fe4450` | Built-in library symbols. | Built-in objects or language library types. |
| `Support function` | `support.function` | `#36f9f6` | Built-in functions. | CSS `var()`, JS built-ins when scoped by grammar. |
| `Support variable` | `support.variable` | `#ff7edb` | Built-in variables. | CSS custom/system variables or language-provided variables. |
| `Object literal key / property` | `meta.object-literal.key`, `support.type.property-name` | `#ff7edb` | Object keys and property names. | JavaScript `{ name: value }`, JSON property names. |
| `Key-value separator` | `punctuation.separator.key-value` | `#b8b0b4` | Punctuation between key and value. | `:` in JSON or object literals. |
| `Embedded punctuation` | `punctuation.section.embedded` | `#fede5d` | Embedded language delimiters. | Template or embedded code punctuation. |
| `Template expression` | `punctuation.definition.template-expression.begin`, `punctuation.definition.template-expression.end` | `#72f1b8` | Start and end of template expressions. | `${` and `}` in JavaScript template strings. |
| `CSS property` | `support.type.property-name.css`, `support.type.property-name.json` | `#72f1b8` | CSS and JSON property names. | CSS `background-color`, JSON `"name"`. |
| `JS Switch control` | `switch-block.expr.js` | `#72f1b8` | JavaScript switch expression area. | `switch (value) { ... }`. |
| `JS object path` | `variable.other.constant.property.js`, `variable.other.property.js` | `#2ee2fa` | JavaScript object property access. | `theme.colors.editor`. |
| `Color` | `constant.other.color` | `#f97e72` | Color literals. | CSS `#ff00ff`, `red`. |
| `Font names` | `support.constant.font-name` | `#f97e72` | Font-family names. | CSS `font-family: Inter`. |
| `CSS #id` | `entity.other.attribute-name.id` | `#36f9f6` | CSS ID selectors. | `#app {}`. |
| `Pseudo CSS` | `entity.other.attribute-name.pseudo-element`, `entity.other.attribute-name.pseudo-class` | `#D50` | CSS pseudo selectors. | `:hover`, `::before`. |
| `CSS support functions (rgb)` | `support.function.misc.css` | `#fe4450` | CSS helper functions. | `rgb()`, `rgba()`, `hsl()`. |
| `Markup heading` | `markup.heading`, `entity.name.section` | `#ff7edb` | Headings and section names. | Markdown `# Heading`. |
| `Markup text` | `text.html`, `keyword.operator.assignment` | `#fffafdEE` | HTML text and assignment operators. | Text between HTML tags, `=` in attributes. |
| `Markup quote` | `markup.quote` | `#b8b0b4cc`, italic | Block quotes. | Markdown `> quoted text`. |
| `Markup list` | `beginning.punctuation.definition.list` | `#ff7edb` | List markers. | Markdown `- item` or `1. item`. |
| `Markup link` | `markup.underline.link` | `#D50` | Link target text. | Markdown URL in `[label](url)`. |
| `Markup link description` | `string.other.link.description` | `#f97e72` | Link label or description. | Markdown `[label]`. |
| `Python function call` | `meta.function-call.generic.python` | `#36f9f6` | Python function calls. | `print(value)`, `render_theme()`. |
| `Python variable params` | `variable.parameter.function-call.python` | `#72f1b8` | Python call arguments. | `render_theme(path=value)`. |
| `C# storage type` | `storage.type.cs` | `#fe4450` | C# type/storage keywords. | `class`, `struct`, `namespace` depending on grammar. |
| `C# local variable` | `entity.name.variable.local.cs` | `#ff7edb` | C# local variables. | `var item = value;`. |
| `C# properties and fields` | `entity.name.variable.field.cs`, `entity.name.variable.property.cs` | `#ff7edb` | C# fields and properties. | `User.Name`, backing fields. |
| `C placeholder` | `constant.other.placeholder.c` | `#72f1b8`, italic | C format placeholders. | `printf("%s", value)`. |
| `C preprocessors` | `keyword.control.directive.include.c`, `keyword.control.directive.define.c` | `#72f1b8` | C preprocessor directives. | `#include`, `#define`. |
| `C storage modifier` | `storage.modifier.c` | `#fe4450` | C modifiers. | `static`, `const` when scoped as modifier. |
| `C++ operators` | `source.cpp keyword.operator` | `#fede5d` | C++ operators. | `::`, `->`, `+`, `=`. |
| `C++ placeholder` | `constant.other.placeholder.cpp` | `#72f1b8`, italic | C++ format placeholders. | `printf("%d", value)`. |
| `C++ include` | `keyword.control.directive.include.cpp`, `keyword.control.directive.define.cpp` | `#72f1b8` | C++ preprocessor directives. | `#include`, `#define`. |
| `C++ constant modifier` | `storage.modifier.specifier.const.cpp` | `#fe4450` | C++ `const` modifier. | `const int value`. |
| `Elixir Classes` | `source.elixir support.type.elixir`, `source.elixir meta.module.elixir entity.name.class.elixir` | `#36f9f6` | Elixir module/type names. | `defmodule MyApp.User`. |
| `Elixir Functions` | `source.elixir entity.name.function` | `#72f1b8` | Elixir function names. | `def render_theme do`. |
| `Elixir Constants` | `source.elixir constant.other.symbol.elixir`, `constant.other.keywords.elixir` | `#36f9f6` | Elixir symbols and keyword constants. | `:ok`, keyword lists. |
| `Elixir String Punctuation` | `source.elixir punctuation.definition.string` | `#72f1b8` | String delimiters in Elixir. | Quotes around strings. |
| `Elixir` | `source.elixir variable.other.readwrite.module.elixir`, matching punctuation | `#72f1b8` | Elixir module variable references. | Module aliases and module punctuation. |
| `Elixir Binary Punctuation` | `source.elixir .punctuation.binary.elixir` | `#ff7edb`, italic | Binary syntax punctuation. | `<<value>>`. |
| `Clojure Globals` | `entity.global.clojure` | `#36f9f6`, bold | Clojure global symbols. | Global vars and definitions. |
| `Clojure Storage` | `storage.control.clojure` | `#36f9f6`, italic | Clojure control/storage forms. | `def`, `let`, `fn` depending on grammar. |
| `Clojure Metadata` | `meta.metadata.simple.clojure`, `meta.metadata.map.clojure` | `#fe4450`, italic | Clojure metadata. | `^:private`, `^{:doc "..."}`. |
| `Clojure Macros, Quoted` | `meta.quoted-expression.clojure` | italic | Quoted Clojure expressions. | `'(a b c)`. |
| `Clojure Symbols` | `meta.symbol.clojure` | `#ff7edbff` | Clojure symbols. | Symbol names inside Clojure code. |
| `Go basic` | `source.go` | `#ff7edbff` | Default Go source text fallback. | Plain Go identifiers not matched by narrower rules. |
| `Go Function Calls` | `source.go meta.function-call.go` | `#36f9f6` | Go function calls. | `fmt.Println(value)`. |
| `Go Keywords` | Go package, import, function, type, const, var, map, channel, control keyword scopes | `#fede5d` | Go keywords. | `package`, `import`, `func`, `type`, `var`. |
| `Go interfaces` | `source.go storage.type`, `keyword.struct.go`, `keyword.interface.go` | `#72f1b8` | Go type/interface constructs. | `struct`, `interface`. |
| `Go Constants e.g. nil, string format (%s, %d, etc.)` | `source.go constant.language.go`, `constant.other.placeholder.go`, `source.go variable` | `#2EE2FA` | Go built-in constants, placeholders, and scoped variables. | `nil`, `"%s"`, Go variables. |
| `Markdown links and image paths` | `markup.underline.link.markdown`, `markup.inline.raw.string.markdown` | `#72f1b8`, italic | Markdown URLs, paths, and inline raw spans. | `[label](./path.md)`, `` `code` ``. |
| `Markdown links and image paths` | `string.other.link.title.markdown` | `#fede5d` | Markdown link titles. | `[label](url "title")`. |
| `Markdown headings` | `markup.heading.markdown`, `entity.name.section.markdown` | `#ff7edb`, bold | Markdown headings. | `# Heading`. |
| `Markdown italic` | `markup.italic.markdown` | `#2EE2FA`, italic | Markdown italic text. | `*italic*`, `_italic_`. |
| `Markdown bold` | `markup.bold.markdown` | `#2EE2FA`, bold | Markdown bold text. | `**bold**`, `__bold__`. |
| `Markdown quotes` | `punctuation.definition.quote.begin.markdown`, `markup.quote.markdown` | `#72f1b8` | Markdown quote marker and quote body. | `> quote`. |
| `Basic source colours` | `source.dart`, `source.python`, `source.scala` | `#ff7edbff` | Default source fallback for Dart, Python, and Scala. | Plain identifiers in those languages. |
| `Dart strings` | `string.interpolated.single.dart` | `#f97e72` | Dart interpolated strings. | `'Hello $name'`. |
| `Dart variable params` | `variable.parameter.dart` | `#72f1b8` | Dart parameters. | `void run(String name)`. |
| `Dart numerics` | `constant.numeric.dart` | `#2EE2FA` | Dart numeric literals. | `final count = 42;`. |
| `Scala variable params` | `variable.parameter.scala` | `#2EE2FA` | Scala parameters. | `def run(name: String)`. |
| `Scala` | `meta.template.expression.scala` | `#72f1b8` | Scala template expressions. | Class or object template bodies. |

## Pink Background Mapping

The current Kawaii background shift preserves the original contrast by matching relative luminance, then moves the hue into a pink range. Keep these mappings when adding new structural backgrounds.

| Original base | Pink-range replacement | Use |
| --- | --- | --- |
| `#171520` | `#1e131a` | Deepest workbench surfaces and floating widgets. |
| `#241b2f` | `#2c1925` | Side bar, status bar, title bar, tab strip. |
| `#2a2139` | `#341e2c` | Inputs, badges, dropdown lists, subtle shadows. |
| `#232530` | `#2e222a` | Dropdown, peek, walkthrough, breadcrumb backgrounds. |
| `#262335` | `#31202b` | Editor and inactive tab background. |
| `#34294f` | `#46243a` | Drag/drop, hover, bracket, and range overlays. |
| `#37294d` | `#46253a` | List hover overlay. |
| `#463465` | `#5a2f4a` | Menus and debug toolbar surface. |
| `#495495` | `#85416c` | Structural borders and editor group overlays. |
| `#614D85` | `#7a4667` | Primary button background. |
| `#745ca0` | `#92547b` | Reserved mapping if this base tone is reintroduced. |
| `#59a4f9` | `#fa72b1` | Reserved mapping if this bright blue tone is reintroduced. |

## Pink Neutral Mapping

Use these mappings when moving white or pseudo-white values into the light pink spectrum. Preserve the alpha suffix (`AA`) when the original color uses `#RRGGBBAA`.

| Original neutral | Pink-range replacement | Use |
| --- | --- | --- |
| `#ffffff` | `#fffafd` | Pure white UI text, selected text, cursor fills, and encoded SVG highlights. |
| `#b6b1b1` | `#b8b0b4` | Muted near-white syntax punctuation and quote text. |
| `#c5c5c5` | `#c8c4c7` | Light neutral detail inside encoded SVG assets. |
| `#fff5f6` | `#fffafd` | Existing warm off-white glow text. |
| `#fff3` | `#fffafd33` | Short-alpha glow shadow; expanded to 8-digit hex for clarity. |
| `#fff951` | Keep unchanged | Yellow accent, not a neutral white. |

## Notes For Future Theme Edits

| Topic | Rule |
| --- | --- |
| Source of truth | Preserve [themes/kawaii_synthwave-color-theme.json](../themes/kawaii_synthwave-color-theme.json) and [themes/kawaii_synthwave-color-theme-light.json](../themes/kawaii_synthwave-color-theme-light.json); edit [themes/kawaii_synthwave-color-theme-overrides.json](../themes/kawaii_synthwave-color-theme-overrides.json) or [themes/kawaii_synthwave-color-theme-light-overrides.json](../themes/kawaii_synthwave-color-theme-light-overrides.json), then run `npm run build:theme`. |
| Generated output | Do not edit [themes/kawaii_synthwave-generated-color-theme.json](../themes/kawaii_synthwave-generated-color-theme.json) or [themes/kawaii_synthwave-generated-color-theme-light.json](../themes/kawaii_synthwave-generated-color-theme-light.json) manually; both are replaced by the build script. |
| Override merge | `colors` and `semanticTokenColors` values in the overrides file replace/merge base keys when defined; matching `tokenColors` rules replace base rules by `name` first, then by `scope`; new token rules append. |
| User color settings | `src/settings.ts` reads the generated theme as defaults and writes local user overrides under `[Dark Pink Kawaii]` or `[Light Pink-Pastel Kawaii]` in `workbench.colorCustomizations` and `editor.tokenColorCustomizations`; `[Kawaii VS Code Color]` and `[Kawaii VS Code Color Light]` are legacy read aliases. |
| Transparency | VS Code color values can use `#RRGGBBAA`; alpha is part of the color value, not animation or runtime opacity logic. |
| Semantic highlighting | The generated dark and light themes currently enable semantic highlighting and define `semanticTokenColors`; verify semantic tokens when changing language-specific colors. |
| Token specificity | More specific TextMate scopes should be placed after broader rules when they must override them. |
| Validation | Use the Extension Development Host and `Developer: Inspect Editor Tokens and Scopes` before deciding a token rule is unused. |

## Official References

| Reference | Link |
| --- | --- |
| VS Code Color Theme guide | https://code.visualstudio.com/api/extension-guides/color-theme |
| VS Code Theme Color reference | https://code.visualstudio.com/api/references/theme-color |
| VS Code Syntax Highlight guide | https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide |
| VS Code Semantic Highlight guide | https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide |
| TextMate naming conventions | https://macromates.com/manual/en/language_grammars |
