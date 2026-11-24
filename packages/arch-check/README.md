# @appium/arch-check

> Checks a package's source against its [C4](https://c4model.com) architecture model

## Summary

Keeps a package's architecture honest. The architecture is written once, as text, in a
[LikeC4](https://likec4.dev) model that lives next to the package. `arch-check` compares the actual
imports against it and fails on:

- an import between components that the model does not declare (domain leaks);
- import cycles, reported separately for runtime and type-only imports;
- source files that no component owns (or that several do);
- optionally, deep imports of scoped packages (e.g. `@appium/support/lib/fs.js`; a subpath is fine
  if the installed package lists it in its `exports`, e.g. `@appium/oxc-config/oxlint`), and
  imports of packages that are not declared in `package.json`.

Known violations are frozen in a baseline, so a package can adopt the check without fixing
everything first. New violations fail, and baseline entries that are fixed must be removed, so the
baseline can only shrink.

## Usage

```bash
npm install --save-dev @appium/arch-check
npx arch-check init [packageDir]               # scaffold architecture/ from the current code
npx arch-check [packageDir...]                 # check (default: current directory)
npx arch-check --workspaces [rootDir]          # check the workspace packages that have a model
npx arch-check --update-baseline               # tolerate all current violations
npx arch-check --verbose                       # list every finding
```

`init` also takes `--source-root <dir>` and `--entry-point-scope <scope>` (repeatable); they are
saved to `config.json`.

Exit code: `0` ok, `1` violations found, `2` usage or runtime error. Relative imports that cannot be
resolved are reported as warnings, as they cannot be checked. `typescript` (5 or 6) must be
installed, as imports are resolved with the package's `tsconfig.json`.

### Getting started

`arch-check init` creates `architecture/` from the code as it is: one component per top-level
directory and per root file of the source root (`lib`, or `src` if `lib` holds build output; use
`--source-root` to override), allowed dependencies taken from the current imports, and a baseline
for the existing cycles. Then:

1. Edit `model.c4`: delete the dependencies that should not be allowed, merge or rename components,
   add descriptions. Run `arch-check --update-baseline` to tolerate the violations this creates.
2. Run `arch-check` in CI.
3. Tell agents about the model, see [AI agents](#ai-agents) (`init` prints a ready snippet).

In a monorepo, run `init` in each package, and `arch-check --workspaces .` from the root.

### Files

The package being checked holds an `architecture/` directory:

| File | Purpose |
|---|---|
| `*.c4` | The LikeC4 model: components, the paths they own, and the dependencies they may have. |
| `baseline.json` | Tolerated violations. Written by `--update-baseline`; each entry may carry a `reason`. |
| `config.json` | Optional settings, see below. |

### The model

Each component declares the files it owns through `metadata.paths` (globs relative to the package,
`*` and `**` supported). Relationships between components are the **allowed** dependencies:

```
specification {
  element container
  element component
}

model {
  app = container 'my-package' {
    cli = component 'cli' {
      metadata { paths 'lib/cli/**' }
    }
    utils = component 'utils' {
      metadata { paths 'lib/utils/**' }
    }
  }

  app.cli -> app.utils
}
```

Every file under the source root must belong to exactly one component; a file that matches no
component, or several, is an error. Components tagged `#unenforced` (declare `tag unenforced` in the
specification) still own their files, but their dependencies are not checked. Elements without
`metadata.paths` (systems, actors, ...) are for diagrams only. Preview the diagrams with `npx likec4 start architecture`.

### `architecture/config.json`

| Option | Default | Description |
|---|---|---|
| `sourceRoot` | `lib` | Directory to check, relative to the package. |
| `tsconfig` | `tsconfig.json` | Used to resolve imports. |
| `entryPointScopes` | `[]` | npm scopes (e.g. `["@appium"]`) whose packages must be declared in `package.json` and imported through their entry points only (a subpath the installed package lists in its `exports` is allowed). A `devDependency` is enough for `import type`. |
| `typeOnlyCycles` | `error` | `ignore` to stop reporting cycles that exist only through `import type`. They have no runtime effect, and patterns such as command mixins that reference their driver's type produce hundreds of them. Runtime cycles are always reported. |
| `undeclaredDependencies` | `ignore` | `error` to require every package the source imports to be declared in `package.json` (`dependencies`, `peerDependencies` or `optionalDependencies`; a `devDependency` is enough for `import type`), so nothing works only because of hoisting. Built-ins, relative and `#` imports, the package itself and tsconfig `paths` aliases are exempt. Without it, only packages in `entryPointScopes` are checked. |

Unknown options are rejected.

### Baseline

`baseline.json` lists tolerated violations: `boundaries` (`from`/`to` files), and `cycles`
(`runtime` and `typeOnly`, each a list of files). Unowned files and package-import violations cannot
be baselined; they are cheap to fix, and `--update-baseline` warns when it finds any. Treat changes to it like changes to the model:
adding an entry accepts a violation, so it deserves review.

## AI agents

The model is only a single source of truth if agents read it and keep it current. A project that
adopts `arch-check` must say so in its `AGENTS.md` (or equivalent), so that agents:

- read the model before adding or moving code, and put new code in the component that owns it;
- run `arch-check` before finishing, as CI does;
- update the model in the same change when a component, path or dependency legitimately changes,
  and explain why in the PR description;
- never loosen the model or the baseline to silence a failure, and only ever remove baseline entries
  as they get fixed.

A snippet to adapt (replace `packages/foo`):

```markdown
## Architecture

`packages/foo/architecture/*.c4` is the source of truth for the component boundaries of
`packages/foo`. CI runs `npx arch-check packages/foo`.

- Before adding or moving code, find the owning component (`metadata.paths`) and respect its
  allowed dependencies. New files must be covered by a component's `paths`.
- Fix a failing check by changing the code. Do not add edges to the model or entries to
  `baseline.json` to make it pass, unless the new dependency is intended; then update the `.c4`
  files in the same change and explain why in the PR description.
- Remove `baseline.json` entries when you fix the violation they cover.
- Keep component descriptions and the paths they own in sync with the code.
```

Agents can also query the model directly: `npx likec4 mcp architecture` starts an MCP server for it.

## API

```ts
import {checkPackage, formatReport} from '@appium/arch-check';

const result = await checkPackage('path/to/package');
console.log(formatReport(result));
process.exitCode = result.ok ? 0 : 1;
```

Also exported: `updateBaseline(dir)`, `initPackage(dir, options)`, `findWorkspacePackages(rootDir)` and
`loadConfig(dir)`, plus the result types.

## License

Apache-2.0
