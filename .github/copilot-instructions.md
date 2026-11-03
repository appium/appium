# Copilot Instructions

## Code Review

When reviewing JavaScript or TypeScript changes, check new uses of Node.js built-in APIs against the supported Node.js versions declared in package.json#engines.node. The current supported range is ^20.19.0 || ^22.12.0 || >=24.0.0.

For each new Node.js built-in API or option, verify that it exists and is stable across all supported Node.js versions. If any supported version lacks the API, only supports it experimentally, or has different behavior, leave a review comment and suggest using the existing dependency, adding a fallback, avoiding the API, or raising the engine requirement.

Example: util.styleText exists in Node.js 20.12+, but only became stable in Node.js 22.13.0 and 23.5.0. Because this repository supports Node.js 20.19.0 and 22.12.0, replacing a color library with util.styleText should be flagged unless the project explicitly accepts relying on a non-stable API for those supported versions.
