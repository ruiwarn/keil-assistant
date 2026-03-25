# Marketplace Differentiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Differentiate the Marketplace identity enough to satisfy Marketplace Support without changing the extension ID or breaking current users.

**Architecture:** Keep runtime behavior unchanged and limit modifications to Marketplace-facing metadata, README messaging, settings group wording, icon assets, and regression tests. Preserve the existing extension ID and configuration keys so installed users remain on the same update path.

**Tech Stack:** TypeScript, Mocha, VS Code extension manifest, Markdown, PNG asset generation

---

### Task 1: Lock the compliance requirements with tests

**Files:**
- Create: `src/test/marketplaceMetadata.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `npm test -- --grep "marketplace metadata"` and confirm it fails**
- [ ] **Step 3: Assert the extension ID stays `keil-assistant-new` while display metadata clearly identifies the fork**

### Task 2: Update Marketplace-facing metadata

**Files:**
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Update display name, short description, and settings title**
- [ ] **Step 2: Rewrite the README title and opening sections to clearly identify the fork and differentiators**
- [ ] **Step 3: Keep commands, configuration keys, and extension ID unchanged**

### Task 3: Replace the icon with a distinct fork identity

**Files:**
- Modify: `res/icons/icon.png`

- [ ] **Step 1: Generate a visually distinct replacement icon**
- [ ] **Step 2: Keep the same asset path so packaging behavior does not change**

### Task 4: Verify and integrate

**Files:**
- Modify: none

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Review the staged diff for compatibility risks**
- [ ] **Step 3: Commit, push, create PR, self-review, and merge**
