# Compatible Issue Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compatibility-first support for issues `#18`, `#22`, `#23`, `#24`, `#25`, and `#26` without changing existing default behavior for current users.

**Architecture:** Extract pure helpers for C/C++ config merging, tree state management, and path diagnostics so they can be tested without the VS Code runtime. Wire the existing `ProjectExplorer` to a real `TreeView`, add opt-in settings and explicit commands, and keep defaults aligned with today's behavior.

**Tech Stack:** TypeScript, VS Code extension API, Node.js built-ins, Mocha

---

### Task 1: Build a Reliable Unit Test Path

**Files:**
- Create: `src/test/cppProperties.test.ts`
- Create: `src/test/pathValidation.test.ts`
- Create: `src/test/treeState.test.ts`
- Modify: `package.json`
- Test: `src/test/cppProperties.test.ts`
- Test: `src/test/pathValidation.test.ts`
- Test: `src/test/treeState.test.ts`

- [ ] **Step 1: Write the failing test for C/C++ config merge preservation**

```ts
import { strict as assert } from 'assert';
import { mergeCppProperties } from '../project/cppProperties';

describe('mergeCppProperties', () => {
    it('preserves user-owned fields on the target configuration', () => {
        const current = {
            configurations: [
                {
                    name: 'Demo_Debug',
                    compilerPath: 'C:/Keil_v5/ARM/ARMCLANG/bin/armclang.exe',
                    includePath: ['legacy/include'],
                    defines: ['OLD'],
                    browse: { path: ['kept/by/user'] }
                }
            ],
            version: 4
        };

        const merged = mergeCppProperties(current, 'Demo_Debug', ['new/include', '${default}'], ['NEW']);

        assert.equal(merged.configurations[0].compilerPath, current.configurations[0].compilerPath);
        assert.deepEqual(merged.configurations[0].browse, current.configurations[0].browse);
        assert.deepEqual(merged.configurations[0].includePath, ['new/include', '${default}']);
        assert.deepEqual(merged.configurations[0].defines, ['NEW']);
    });
});
```

- [ ] **Step 2: Write the failing test for path diagnostics**

```ts
import { strict as assert } from 'assert';
import { validateExecutionPaths } from '../project/pathValidation';

describe('validateExecutionPaths', () => {
    it('reports the exact missing path kind', () => {
        const result = validateExecutionPaths({
            builderExe: 'C:/missing/Uv4Caller.exe',
            uv4Path: 'C:/Keil_v5/UV4/UV4.exe',
            projectFile: 'D:/fw/demo.uvprojx',
            projectDir: 'D:/fw'
        }, () => false);

        assert.equal(result.ok, false);
        assert.equal(result.errors[0].kind, 'builderExe');
    });
});
```

- [ ] **Step 3: Write the failing test for tree-state IDs and sorting**

```ts
import { strict as assert } from 'assert';
import { buildTreeItemId, sortProjects } from '../projectExplorer/treeState';

describe('treeState', () => {
    it('builds stable IDs from project path and labels', () => {
        assert.equal(
            buildTreeItemId('group', {
                projectPath: 'D:/fw/demo.uvprojx',
                targetName: 'Debug',
                groupName: 'Drivers'
            }),
            'group:d:/fw/demo.uvprojx:Debug:Drivers'
        );
    });

    it('keeps legacy order when sort mode is legacy', () => {
        const result = sortProjects(
            [
                { label: 'B', path: 'D:/b.uvprojx' },
                { label: 'A', path: 'D:/a.uvprojx' }
            ],
            'legacy'
        );

        assert.deepEqual(result.map(item => item.label), ['B', 'A']);
    });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test -- --grep "mergeCppProperties|validateExecutionPaths|treeState"`

Expected: FAIL with module-not-found or missing export errors because the helper modules and working test runner do not exist yet.

- [ ] **Step 5: Replace the broken default test entry with a Mocha-based unit test command**

```json
{
  "scripts": {
    "pretest": "npm run lint && npm run compile",
    "test": "npx mocha dist/test/**/*.test.js"
  }
}
```

- [ ] **Step 6: Run tests again to verify the failure is now from missing helpers, not from a broken runner**

Run: `npm test -- --grep "mergeCppProperties|validateExecutionPaths|treeState"`

Expected: FAIL with import/export errors for `../project/cppProperties`, `../project/pathValidation`, and `../projectExplorer/treeState`.

- [ ] **Step 7: Commit the test harness setup**

```bash
git add package.json src/test/cppProperties.test.ts src/test/pathValidation.test.ts src/test/treeState.test.ts
git commit -m "test: add unit test entry points for compatibility work"
```

### Task 2: Preserve User-Owned `c_cpp_properties.json` Fields

**Files:**
- Create: `src/project/cppProperties.ts`
- Modify: `src/extension.ts`
- Test: `src/test/cppProperties.test.ts`

- [ ] **Step 1: Extend the failing merge test to cover legacy config-name migration**

```ts
it('migrates a legacy target-name config without dropping user fields', () => {
    const current = {
        configurations: [
            {
                name: 'Debug',
                compilerPath: 'C:/Keil_v5/ARM/ARMCC/bin/armcc.exe',
                forcedInclude: ['kept.h']
            }
        ],
        version: 4
    };

    const merged = mergeCppProperties(current, 'Demo_Debug', ['inc', '${default}'], ['DEF'], 'Debug');

    assert.equal(merged.configurations[0].name, 'Demo_Debug');
    assert.deepEqual(merged.configurations[0].forcedInclude, ['kept.h']);
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- --grep "mergeCppProperties"`

Expected: FAIL because `mergeCppProperties` is not implemented.

- [ ] **Step 3: Implement the minimal pure merge helper**

```ts
export function mergeCppProperties(
    current: any,
    configName: string,
    includePath: string[],
    defines: string[],
    legacyName?: string
) {
    const root = current && typeof current === 'object' ? { ...current } : { version: 4 };
    const configurations = Array.isArray(root.configurations) ? [...root.configurations] : [];

    let index = configurations.findIndex(conf => conf?.name === configName);
    const legacyIndex = legacyName ? configurations.findIndex(conf => conf?.name === legacyName) : -1;

    if (index === -1 && legacyIndex !== -1) {
        index = legacyIndex;
    }

    const next = index === -1 ? { name: configName } : { ...configurations[index], name: configName };
    next.includePath = includePath;
    next.defines = defines;

    if (index === -1) {
        configurations.push(next);
    } else {
        configurations[index] = next;
    }

    root.configurations = configurations;
    root.version = root.version || 4;
    return root;
}
```

- [ ] **Step 4: Wire `Target.updateCppProperties()` to use the helper instead of mutating JSON inline**

```ts
const merged = mergeCppProperties(
    obj,
    this.cppConfigName,
    Array.from(this.includes).concat(['${default}']),
    Array.from(this.defines),
    this.targetName
);

proFile.Write(JSON.stringify(merged, undefined, 4));
```

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `npm test -- --grep "mergeCppProperties"`

Expected: PASS

- [ ] **Step 6: Run a compile-only regression check**

Run: `npm run compile`

Expected: PASS

- [ ] **Step 7: Commit the merge-preservation change**

```bash
git add src/project/cppProperties.ts src/extension.ts src/test/cppProperties.test.ts
git commit -m "fix: preserve user-owned cpp properties fields"
```

### Task 3: Add Path Diagnostics and Safe Refresh Commands

**Files:**
- Create: `src/project/pathValidation.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`
- Test: `src/test/pathValidation.test.ts`

- [ ] **Step 1: Extend the failing path-validation test to cover missing project directory and missing UV4**

```ts
it('reports missing project directory before task execution', () => {
    const result = validateExecutionPaths({
        builderExe: 'C:/tools/Uv4Caller.exe',
        uv4Path: 'C:/Keil_v5/UV4/UV4.exe',
        projectFile: 'D:/fw/demo.uvprojx',
        projectDir: 'D:/fw'
    }, candidate => candidate !== 'D:/fw');

    assert.equal(result.ok, false);
    assert.equal(result.errors[0].kind, 'projectDir');
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- --grep "validateExecutionPaths"`

Expected: FAIL because `validateExecutionPaths` is not implemented.

- [ ] **Step 3: Implement the pure path validation helper**

```ts
export function validateExecutionPaths(
    input: {
        builderExe: string;
        uv4Path: string;
        projectFile: string;
        projectDir: string;
    },
    exists: (path: string) => boolean
) {
    const errors = [];

    if (!exists(input.builderExe)) errors.push({ kind: 'builderExe', path: input.builderExe });
    if (!exists(input.uv4Path)) errors.push({ kind: 'uv4Path', path: input.uv4Path });
    if (!exists(input.projectFile)) errors.push({ kind: 'projectFile', path: input.projectFile });
    if (!exists(input.projectDir)) errors.push({ kind: 'projectDir', path: input.projectDir });

    return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: Register explicit commands for refresh and cache-clear refresh**

```json
{
  "contributes": {
    "commands": [
      { "command": "project.refresh", "title": "Refresh Keil Project" },
      { "command": "project.clearCacheAndRefresh", "title": "Clear Project Cache And Refresh" },
      { "command": "project.revealCurrentFile", "title": "Reveal Current File In Keil Project" }
    ]
  }
}
```

Keep these commands Command Palette-only in this round. Do not add new persistent `view/title` buttons or context-menu entries unless a later pass proves they do not change the default explorer experience.

- [ ] **Step 5: Call path validation before open/build/rebuild/download and surface a precise error**

```ts
const validation = validateExecutionPaths(input, candidate => fs.existsSync(candidate));
if (!validation.ok) {
    showMessage(formatPathValidationErrors(validation.errors), 'error', 4000);
    return;
}
```

- [ ] **Step 6: Implement `project.refresh` and `project.clearCacheAndRefresh` as explicit, safe commands**

```ts
subscriber.push(vscode.commands.registerCommand('project.refresh', () => prjExplorer.refreshActiveProject(false)));
subscriber.push(vscode.commands.registerCommand('project.clearCacheAndRefresh', () => prjExplorer.refreshActiveProject(true)));
```

- [ ] **Step 7: Run the targeted test to verify it passes**

Run: `npm test -- --grep "validateExecutionPaths"`

Expected: PASS

- [ ] **Step 8: Run compile and lint**

Run: `npm run lint`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 9: Commit the diagnostics and refresh work**

```bash
git add package.json src/project/pathValidation.ts src/extension.ts src/test/pathValidation.test.ts
git commit -m "feat: add path diagnostics and safe project refresh commands"
```

### Task 4: Add Opt-In Tree State, Sorting, and Current-File Reveal

**Files:**
- Create: `src/projectExplorer/treeState.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`
- Test: `src/test/treeState.test.ts`

- [ ] **Step 1: Extend the failing tree-state tests to cover name/path sorting and file-to-node matching**

```ts
it('sorts by normalized path when requested', () => {
    const result = sortProjects(
        [
            { label: 'Demo', path: 'D:/z/demo.uvprojx' },
            { label: 'Demo', path: 'D:/a/demo.uvprojx' }
        ],
        'path'
    );

    assert.deepEqual(result.map(item => item.path), ['D:/a/demo.uvprojx', 'D:/z/demo.uvprojx']);
});

it('finds the visible tree path for a current file', () => {
    const match = findRevealPath('D:/fw/Core/Src/main.c', [
        {
            projectPath: 'D:/fw/demo.uvprojx',
            targetName: 'Debug',
            groupName: 'Core',
            filePath: 'D:/fw/Core/Src/main.c'
        }
    ]);

    assert.equal(match?.groupName, 'Core');
});
```

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `npm test -- --grep "treeState"`

Expected: FAIL because the helper module is not implemented.

- [ ] **Step 3: Implement pure helpers for stable IDs, sort modes, and reveal matching**

```ts
export function buildTreeItemId(kind: string, input: Record<string, string>) {
    const normalize = (value: string) => value.replace(/\\\\/g, '/').toLowerCase();
    return [kind, ...Object.values(input).map(normalize)].join(':');
}

export function sortProjects<T extends { label: string; path: string }>(items: T[], mode: 'legacy' | 'name' | 'path') {
    if (mode === 'legacy') return items;
    return [...items].sort((a, b) => {
        const keyA = mode === 'name' ? a.label : a.path;
        const keyB = mode === 'name' ? b.label : b.path;
        return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
    });
}
```

- [ ] **Step 4: Add opt-in settings with compatibility-safe defaults**

```json
{
  "KeilAssistant.ProjectExplorer.RememberExpandedState": {
    "type": "boolean",
    "default": false
  },
  "KeilAssistant.ProjectExplorer.SortOrder": {
    "type": "string",
    "enum": ["legacy", "name", "path"],
    "default": "legacy"
  },
  "KeilAssistant.ProjectExplorer.AutoRevealCurrentFile": {
    "type": "boolean",
    "default": false
  }
}
```

- [ ] **Step 5: Upgrade `ProjectExplorer` to keep a `TreeView<IView>` instance and assign stable `TreeItem.id` values**

```ts
this.treeView = vscode.window.createTreeView('project', { treeDataProvider: this });
context.subscriptions.push(this.treeView);

res.id = buildTreeItemId(...);
```

- [ ] **Step 6: Persist expanded state only when the setting is enabled, and restore it after refresh**

```ts
this.treeView.onDidExpandElement(event => this.onExpandStateChanged(event.element, true));
this.treeView.onDidCollapseElement(event => this.onExpandStateChanged(event.element, false));
```

- [ ] **Step 7: Implement the explicit `project.revealCurrentFile` command and optional auto-reveal setting**

```ts
subscriber.push(vscode.commands.registerCommand('project.revealCurrentFile', () => prjExplorer.revealCurrentEditor()));
```

- [ ] **Step 8: Run the targeted test to verify it passes**

Run: `npm test -- --grep "treeState"`

Expected: PASS

- [ ] **Step 9: Run compile and lint**

Run: `npm run lint`
Expected: PASS

Run: `npm run compile`
Expected: PASS

- [ ] **Step 10: Commit the tree-state work**

```bash
git add package.json src/projectExplorer/treeState.ts src/extension.ts src/test/treeState.test.ts
git commit -m "feat: add opt-in tree state and reveal support"
```

### Task 5: Run No-Regression Verification and Update User Docs

**Files:**
- Modify: `README.md`
- Modify: `README_EN.md`
- Test: `src/test/cppProperties.test.ts`
- Test: `src/test/pathValidation.test.ts`
- Test: `src/test/treeState.test.ts`

- [ ] **Step 1: Add concise documentation for the new commands and opt-in settings**

```md
### Compatibility-first project explorer options

- `KeilAssistant.ProjectExplorer.RememberExpandedState` (default: `false`)
- `KeilAssistant.ProjectExplorer.SortOrder` (default: `legacy`)
- `KeilAssistant.ProjectExplorer.AutoRevealCurrentFile` (default: `false`)

Commands:
- `Refresh Keil Project`
- `Clear Project Cache And Refresh`
- `Reveal Current File In Keil Project`
```

- [ ] **Step 2: Run the full automated verification**

Run: `npm test`

Expected: PASS

Run: `npm run lint`

Expected: PASS

Run: `npm run compile`

Expected: PASS

- [ ] **Step 3: Perform manual no-regression checks in VS Code**

Run through this checklist:

- Open a workspace with one `.uvprojx` and confirm auto-load still works.
- Open a workspace with multiple projects and confirm default order matches current `legacy` behavior.
- Build, rebuild, and download from the status bar without enabling any new setting.
- Click a source node and confirm file opening behavior is unchanged.
- Enable `RememberExpandedState`, expand groups, reload window, and confirm only then does state restore.
- Run `Reveal Current File In Keil Project` and confirm explicit reveal works without affecting normal open flow.

- [ ] **Step 4: Commit the verification and docs update**

```bash
git add README.md README_EN.md
git commit -m "docs: describe compatibility-first project explorer options"
```
