# Marketplace Logo Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Marketplace-visible Microsoft-branded screenshots and publish a new reviewable patch release without changing user-facing behavior, extension ID, or settings keys.

**Architecture:** Keep the already-differentiated Marketplace identity from `2.5.1`, then make a narrowly scoped compliance pass over Marketplace-visible documentation, release metadata, and regression coverage. Repository-facing README copy can move toward an "independent continuation" tone, but one concise origin notice remains. All functional code paths remain untouched so existing users keep the same upgrade and configuration experience.

**Tech Stack:** TypeScript, Mocha, VS Code extension manifest, Markdown

---

### Task 1: Lock the README compliance rule with a regression test

**Files:**
- Modify: `src/test/marketplaceMetadata.test.ts`

- [ ] **Step 1: Add a failing assertion that README files do not reference Marketplace-risk screenshots**
- [ ] **Step 2: Run `npm test -- --grep "marketplace metadata"` and confirm the new assertion fails before the README cleanup**
- [ ] **Step 3: Keep the Marketplace identity assertions intact while allowing README copy to move toward independent-maintenance wording**

### Task 2: Remove high-risk Marketplace assets from README content

**Files:**
- Modify: `README.md`
- Modify: `README_EN.md`

- [ ] **Step 1: Remove image references that expose VS Code, Copilot, Live Share, or similar Microsoft-branded UI**
- [ ] **Step 2: Replace those screenshot sections with concise text descriptions**
- [ ] **Step 3: Reword the top README sections to reduce repeated fork phrasing while preserving a short origin notice**
- [ ] **Step 4: Preserve compatibility guidance and repository links**

### Task 3: Publishable release metadata update

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump the patch version for a new Marketplace package**
- [ ] **Step 2: Record the compliance-only release note**
- [ ] **Step 3: Keep package name, publisher, repository, and settings keys unchanged**

### Task 4: Verify and integrate

**Files:**
- Modify: none

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Review the diff for compatibility regressions**
- [ ] **Step 3: Commit, push, create PR, self-review, and merge**
