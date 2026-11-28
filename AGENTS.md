# Repository guidance

Before changing code, read and follow the
[contributor style guide](packages/appium/docs/en/contributing/index.md#code-style).

## Architecture

`packages/appium/architecture/*.c4` is the source of truth for the component boundaries of
`packages/appium/lib`. CI runs `npm run arch:check` ([`@appium/archward`](packages/archward)).

- Before adding or moving code, find the owning component (`metadata.paths`) and respect its
  allowed dependencies. New files must be covered by a component's `paths`.
- Fix a failing check by changing the code. Do not add edges to the model or entries to
  `baseline.json` to make it pass, unless the new dependency is intended; then update the `.c4`
  files in the same change and explain why in the PR description.
- Remove `baseline.json` entries when you fix the violation they cover
  (`npm run arch:baseline` rewrites it; it keeps each entry's `reason`).
- Keep component descriptions and the paths they own in sync with the code.
- `npm run arch:preview` opens the diagrams.
