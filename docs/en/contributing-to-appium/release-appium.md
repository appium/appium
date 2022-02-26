# Releasing an Appium Core Project

This document explains how to release a new version of one or more packages in [this monorepo](https://github.com/appium/appium).

Note: the shell commands herein expect `lerna` in your `PATH`; you can also use `npx lerna`.

> See the [`lerna publish`](https://github.com/lerna/lerna/tree/main/commands/publish) docs for more info.

## Automatic Releases

This project uses [Lerna](https://lerna.js.org) to manage the versioning and publishing of its packages.  Because we use [conventional commit messages](https://conventionalcommits.org), Lerna can parse these messages to determine which packages need releasing and with what version.

There's really only one step here.  To version and publish _potentially all_ packages automatically, navigate to the branch to be published, and issue:

```bash
lerna publish
```

You will then see an interactive prompt, which lists the proposed new package versions to confirm.  It will look a bit like this:

```bash
lerna notice cli v4.0.0
lerna info versioning independent
lerna info Looking for changed packages since @appium/fake-driver@2.2.0
lerna info ignoring diff in paths matching [ '**/test/**', '**/*.md' ]
lerna info getChangelogConfig Successfully resolved preset "conventional-changelog-angular"

Changes:
 - appium: 2.0.0-beta.12 => 2.0.0-beta.13
 - @appium/base-driver: 8.0.0-beta.6 => 8.0.0-beta.7
 - @appium/doctor: 1.16.0 => 1.16.1
 - @appium/eslint-config-appium: 4.7.0 => 4.7.1
 - @appium/fake-driver: 2.2.0 => 2.2.1
 - @appium/gulp-plugins: 5.5.0 => 5.5.1
 - @appium/support: 2.53.0 => 2.53.1
 - @appium/test-support: 1.3.3 => 1.3.4

? Are you sure you want to publish these packages? (ynH)
```

The information shown above:

1. The current version of the `lerna` executable
1. A notice that this project uses "independent" versioning; i.e., all packages have their own version numbers.
1. The _most recent Git tag_ Lerna found (`@appium/fake-driver@2.2.0`); if a changeset contains multiple tags, it only display one.
1. Globs which are ignored when computing versions, e.g., a commit message beginning with `fix(scope)` will ignore any changesets consisting of _only_ modifications to files matching the globs--if any other files are modified, `fix(scope)` would cause a "patch" version bump, as per the conventional commits specification.
1. Confirmation that Lerna is using conventional commit messages to determine versions
1. A list of all packages that have changed and their new proposed versions

In this example, _every package_ has had changes since we last published.  Lerna is also configured to use prerelease versions, where appropriate.

If you are happy with what it's going to do, confirm with `y` and continue to bump the package versions, then publish each.  This does the same thing as running `npm version` then `npm publish` in each package, in series--all relevant lifecycle scripts are executed.  In addition, any new tags will be pushed to GitHub, and releases will be created corresponding to the tags.  The tags are of the format `[@scope/]<package-name>@<new-version>`.

> _TBD: update w/ Lerna's behavior around changelogs and GH releases is determined or further defined_

## Releasing a Single Package

**This is not recommended.**   Lerna relies heavily on Git tags to do its thing, and a mistake would be costly.  It is only _possible_ because we use independent versioning.

1. Navigate to a package directory and call `npm version --no-git-tag-version <newversion>`.
1. You **must** tag the version manually using the format `[@scope/]<package-name>@<new-version>`.
1. Push the new changeset and tag to GitHub.
1. Issue `npm publish` from this package directory.
1. You will need to edit `CHANGELOG.md` and create the GitHub release yourself, which sucks for you.

## Publish to GA

1. Create a new post on <https://discuss.appium.io> announcing the release of the package(s). Post it in the "News" category. Paste in the changelog and any choice comments. Pin it and unpin the previous release post.
1. Begin process of releasing [`appium-desktop`](https://github.com/appium/appium-desktop).
1. Notify @jlipps to so he can tweet a link to the discuss post.
