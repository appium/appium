# @appium/arch-check

> Checks a package's source against its [C4](https://c4model.com) architecture model

## Summary

Keeps a package's architecture honest. The architecture is written once, as text, in a
[LikeC4](https://likec4.dev) model that lives next to the package. `arch-check` compares the actual
imports against it and fails on:

- an import between components that the model does not declare (domain leaks);
- import cycles, reported separately for runtime and type-only imports;
- source files that no component owns;
- deep imports of scoped packages (e.g. `@appium/support/lib/fs.js`) and imports of scoped packages
  that are not declared in `package.json` (optional).

Known violations are frozen in a baseline, so a package can adopt the check without fixing
everything first. New violations fail, and baseline entries that are fixed must be removed, so the
baseline can only shrink.

## Usage

```bash
npm install --save-dev @appium/arch-check
npx arch-check [packageDir]                    # check (default: current directory)
npx arch-check --update-baseline               # tolerate all current violations
npx arch-check --verbose                       # list every finding
```

Exit code: `0` ok, `1` violations found, `2` usage or runtime error. `typescript` (5 or 6) must be
installed, as imports are resolved with the package's `tsconfig.json`.

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

Components tagged `#unenforced` are documented but not checked. Elements without `metadata.paths`
(systems, actors, ...) are for diagrams only. Preview the diagrams with `npx likec4 start architecture`.

### `architecture/config.json`

| Option | Default | Description |
|---|---|---|
| `sourceRoot` | `lib` | Directory to check, relative to the package. |
| `tsconfig` | `tsconfig.json` | Used to resolve imports. |
| `entryPointScopes` | `[]` | npm scopes (e.g. `["@appium"]`) whose packages must be declared in `package.json` and imported through their entry points only. |

### Baseline

`baseline.json` lists tolerated violations: `boundaries` (`from`/`to` files), and `cycles`
(`runtime` and `typeOnly`, each a list of files). Treat changes to it like changes to the model:
adding an entry accepts a violation, so it deserves review.

## API

```ts
import {checkPackage, formatReport} from '@appium/arch-check';

const result = await checkPackage('path/to/package');
console.log(formatReport(result));
process.exitCode = result.ok ? 0 : 1;
```

## License

Apache-2.0
