# Marketplace Differentiation Design

## Goal

Make the Marketplace-facing identity clearly distinct from the original "Keil Assistant" extension while preserving the existing extension ID, configuration keys, and upgrade path for current users.

## Constraints

- Keep the existing extension ID to avoid losing installed users.
- Do not rename configuration keys or commands that users already rely on.
- Change only the Marketplace-facing surfaces that were called out by Marketplace Support:
  - display name
  - description
  - logo
  - README content

## Approved Direction

- Rename the visible product name to `Keil Assistant Community Fork`.
- Rewrite the short description so it explicitly states this is a community-maintained fork.
- Rewrite the README header and opening sections so the fork relationship and differentiating features are immediately visible.
- Replace the current icon with a visually distinct community-fork icon.
- Update the Settings section title to match the visible product name.

## Compatibility

- Keep `name: keil-assistant-new` unchanged.
- Keep the publisher unchanged.
- Keep all `KeilAssistant.*` configuration keys unchanged.
- Keep commands and existing behavior unchanged.

## Verification

- Add regression tests that assert:
  - the extension ID remains unchanged
  - the visible display name and description explicitly identify the fork
  - the README top section clearly states fork status and differentiating features
