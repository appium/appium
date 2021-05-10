# Releasing Appium
Appium follows the GitLab flow approach. Releases are made on release branches that have the format `releases/x.y` where `x` is a major version and `y` is a minor version. The main Appium repository doesn't strictly follow semver (unlike the dependencies of Appium). A minor release (e.g.: `1.20.0`) means that we're creating a new release that has a newly created set of dependencies that are shrinkwrapped to the latest. A patch release (e.g.: `1.20.4`) isn't strictly a "patch", but just means that we're making an intermediary release that brings in small changes. For example, suppose I have a new version of `appium-xcuitest-driver` that I want to publish and it can't wait until the next minor release. To bring in that change, I would checkout the release branch (e.g.: `git checkout releases/1.20`); install the dependency (`npm install appium-xcuitest-driver@version && git commit -a -m 'bump appium-xcuitest-driver to version $version`); release a "release candidate" (see below) and then when it's ready, graduate the "release candidate" to general availability

## Create a release branch
1. `bash ./scripts/release-branch.sh x.y` where `x` is the major version and `y` is the minor version (example: `bash ./scripts/release-branch.sh 1.20`)
  * This will create:
    * A release branch `releases/1.20`
    * A git tag `v1.20.0-rc.0`
    * Publish a NPM package `1.20.0-rc.0` as a release candidate
1. Create a changelog pull request

## Create a release candidate
1. Checkout the release branch (e.g.: `git checkout releases/1.21 && git pull origin releases/1.21`)
1. `bash ./scripts/release.sh rc`

## Publish to GA
1. Checkout the release branch (e.g.: `git checkout releases/1.21 && git pull origin releases/1.21`)
1. `bash ./scripts/release-latest.sh 1.21.0`
    - The `1.21.0` must be proper version name
1. Update the site docs by going to https://github.com/appium/appium.io/pulls and merging the latest pull request that was opened by the Triager bot. Close any other pull requests opened by Triager bot.
1. Create a new release on GitHub: go to `https://github.com/appium/appium/releases/tag/v<VERSION>` and hit "Edit Tag". Make the release name `<VERSION>` (e.g., `2.0.5`), then paste in the changelog (but not the changelog header for this version). If it's a beta release, mark as pre-release.
    - Please check _Create a discussion for this release_ and select _Release_ category
1. Create a new post on discuss.appium.io announcing the release. Post it in the "News" category. Paste in the changelog and any choice comments. Pin it and unpin the previous release post.
1. Begin process of releasing `appium-desktop`.
1. Notify @jlipps to so he can tweet a link to the discuss post.
1. Create the next beta
    1. Bump the `version` name in `package.json` for the next beta on the main branch. e.g. `1.22.0-beta.0`
    2. Commit the change without a tag,
    3. Push the version as `npm publish --tag beta`.

# Troubleshooting

## When you publish a version to a wrong channel

For example, you accidentally pusbed `rc` version into the `latest` channel.
Then, you could add the `deprecated` label to this version , and re-tag the previous stable version in order to keep the stable one via `npm install`.
`dist-tag` command helps to achieve that.

```
$ npm deprecate appium@1.21.0-rc.0 "this release should be in rc channel" --tag=latest
$ npm dist-tag add appium@1.20.2 latest
```

You can confirm if the above step works by calling `npm install -g appium`.
Once you can install `appium@1.20.2`, the above step worked.
(You may need to wait for a few minutes because of npm caching.)
