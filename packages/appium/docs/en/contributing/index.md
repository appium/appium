---
hide:
  - navigation

title: Contributing to Appium
---

Appium welcomes contributions of all kinds. You do not need to know Appium internals to help, and all participation is governed by our [Code of Conduct](https://github.com/appium/.github/blob/master/CODE_OF_CONDUCT.md). This guide covers how to find work, set up the repository, develop and validate changes, and submit a pull request.

## Community and Questions

Use the Appium forum for general questions rather than the issue tracker. The repository's issue templates direct questions to [discuss.appium.io](https://discuss.appium.io/).

If you use Appium and want to share your knowledge, browse the forum questions and answer any you can. GitHub Discussions are also available at [github.com/appium/appium/discussions](https://github.com/appium/appium/discussions). Maintainer-provided categories include:

- **General** — chat about anything and everything
- **Ideas** — share ideas for new features
- **Polls** — take a vote from the community
- **Q&A** — ask the community for help
- **Release**
- **Show and tell** — show off something you've made

## Ways to Contribute

- **Report bugs or request features.** Use the [GitHub issue tracker](https://github.com/appium/appium/issues) and the appropriate issue form template.
- **Triage issues.** If you are familiar enough with Appium to reproduce bugs, help investigate reported issues. Start with issues labeled `Needs Triage` or `Needs Info`. Check the issue tracker and leave relevant comments: link duplicates to the original issue, ask for missing information such as Appium logs, and provide details if you can reproduce the problem. For further help triaging Appium issues across any Appium project repository, contact a member of the [Technical Committee](https://github.com/appium/appium/blob/master/GOVERNANCE.md#the-technical-committee).
- **Contribute code or documentation.** Pull requests for improving the Appium code or documentation are welcome.
- **Look for `help needed` issues.** Browse the issue tracker for issues labeled `help needed` to find contributions that are wanted.

Developer information may not be kept up to date as frequently as user-facing information, or it may be most relevant in its current form on the repository rather than in the published version. Check the repository or discuss with maintainers; we are glad to help new contributors get started. For a relatively large or complex change, start a discussion before implementing.

## Set Up Your Development Environment

Use a Node.js version matching `^20.19.0 || ^22.12.0 || >=24.0.0` and npm `>=10`.

Forking the repository is recommended. Clone the repository and enter the project directory:

```bash
git clone https://github.com/appium/appium.git
cd appium
```

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Start the locally built Appium server:

```bash
npm start
```

For an iterative development state, run the watch build:

```bash
npm run dev
```

VS Code users can also check out the project using [Runme](https://runme.dev/api/runme?repository=https%3A%2F%2Fgithub.com%2Fappium%2Fappium.git&fileToOpen=packages%2Fappium%2Fdocs%2Fen%2Fcontributing%2Findex.md).

## Develop and Validate

### Code Guidelines

- Follow `.editorconfig`: two-space indentation, LF line endings, UTF-8, a final newline, no trailing whitespace, and a 120-character maximum line length for JavaScript, TypeScript, JSON, and related files. Markdown files are exempt from trailing-whitespace trimming.
- Use type-only imports consistently in TypeScript files. ESLint enforces `@typescript-eslint/consistent-type-imports` with separate type imports.
- Keep code compatible with the Node.js and npm versions listed in [Set Up Your Development Environment](#set-up-your-development-environment).
- When adding or changing Node.js built-in APIs or options, verify that they exist and are stable across all supported Node.js versions. If a supported version lacks the API, only supports it experimentally, or has different behavior, use the existing dependency, add a fallback, avoid the API, or raise the engine requirement.

### Run Checks and Tests

Before submitting, validate changes with the repository's configured lint, type, unit, smoke, and end-to-end checks. Run the relevant tests, confirm lint and unit tests pass locally with your changes, and add tests that demonstrate your fix is effective or your feature works.

From the repository root, run the checks relevant to your changes:

```bash
npm run lint
npm run test:unit
npm run test:types
npm run test:smoke
npm run test:e2e
npm run test:quick # unit and types
npm run test:slow # everything
```

To run unit tests for a specific workspace, set `APPIUM_WORKSPACE` to the package you are working on and run:

```bash
export APPIUM_WORKSPACE=@appium/base-driver
npm run test:unit -w $APPIUM_WORKSPACE
```

Also ensure any dependent changes have been merged and published in downstream modules.

## Documentation Contributions

Documentation lives in the repository as Markdown files under [`packages/appium/docs`](https://github.com/appium/appium/tree/master/packages/appium/docs) and is built by `@appium/docutils`. The documentation system is based on [MkDocs](https://www.mkdocs.org/) and requires [Python](https://www.python.org/).

To work on documentation:

1. Install documentation dependencies:

   ```bash
   npm run install-docs-deps
   ```

2. Start the docs dev server:

   ```bash
   npm run dev:docs
   ```

3. View the docs at http://127.0.0.1:8000/docs/en.

Add necessary documentation when appropriate. Document important behavior or usage details in the relevant developer documentation. Prefer documenting existing behavior over changing it when a change could break existing scripts or API compatibility.

### Documentation Localization

Appium documentation localization is automated via [Crowdin](https://crowdin.com). Do not edit translated documents directly in the GitHub Appium repository; they are replaced during a Crowdin sync.

To translate, join the translators group for the [Appium Documentation](https://crowdin.com/project/appium-documentation) Crowdin project. If your language is missing, let us know by creating an [issue](https://github.com/appium/appium/issues).

Source-language docs changes are synced to Crowdin automatically by the `Update Crowdin English Docs` GitHub Action when files under `packages/appium/docs/en/**.md` or `packages/appium/docs/mkdocs-en.yml` change. To fetch translated files from Crowdin, trigger the `Sync Crowdin Docs Translations` action; it should create a PR with the translated resources.

## Submit a Pull Request

Before opening a pull request, review the requirements below and sign the CLA.

1. Use the pull request template to describe the big picture of your changes and why they should be accepted. If your change fixes a bug or resolves a feature request, link to the relevant issue.
2. Mark the type of change: bugfix, new feature, breaking change, or documentation update.
3. For large or complex changes, use the Further comments section to explain why you chose the solution and what alternatives you considered.
4. Give your pull request a Conventional Commits-compliant title; pull request titles are linted with the Angular preset. Use Conventional Commits for commit messages as well.
5. Complete the pull request checklist. You can also fill it out after creating the pull request. If you are unsure about any checklist item, ask.
