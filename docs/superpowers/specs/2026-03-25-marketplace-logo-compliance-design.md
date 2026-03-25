# Marketplace Logo Compliance Design

## Goal

Remove Marketplace-facing assets that can be interpreted as Microsoft-owned branding while preserving the extension identity, extension ID, configuration keys, and upgrade path for current users. At the same time, reduce repetitive "fork" wording in repository-facing README text without removing the minimal origin notice needed for Marketplace review.

## Constraints

- Keep the existing extension ID `keil-assistant-new`.
- Keep the publisher unchanged.
- Keep all `KeilAssistant.*` settings keys unchanged.
- Do not change runtime behavior, commands, or defaults.
- Minimize visual and documentation edits so old users are not asked to relearn the product.

## Approved Direction

- Keep the already differentiated Marketplace display name, description, icon, and repository metadata from `2.5.1`.
- Remove README image references that show VS Code, Copilot, Live Share, or other Microsoft-branded UI surfaces.
- Replace image-heavy README sections with text-only descriptions so Marketplace reviewers can verify functionality without screenshot assets.
- Reword the top README sections from repeated "fork" phrasing to "independent continuation" phrasing while preserving one concise origin statement.
- Add a regression test that prevents README files from referencing the removed high-risk screenshots.
- Publish the change as a patch release so Marketplace Support can review a new package version.

## Compatibility

- Existing installs continue to update through the same Marketplace item.
- Existing configuration keys remain unchanged.
- Existing commands remain unchanged.
- Existing project behavior remains unchanged.

## Verification

- README and README_EN no longer reference the removed screenshots.
- Package metadata still points to the GitHub repository and issues page for this extension.
- The extension version is incremented for a publishable Marketplace package.
- `npm test` passes after the documentation and metadata changes.
