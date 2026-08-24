# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.0](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.8...@appium/storage-plugin@2.0.0) (2026-08-24)

### ⚠ BREAKING CHANGES

* **storage-plugin:** @appium/storage-plugin is now an ESM-only package. It can no longer be loaded via CommonJS require(); consumers must use import or dynamic import(). Deep imports into the package&#x27;s internals are no longer possible — only the public entry point is exposed via exports.

### Features

* **storage-plugin:** Add route aliases ([#22558](https://github.com/appium/appium/issues/22558)) ([a551c38](https://github.com/appium/appium/commit/a551c3817156bbc7e06793227643a2d11c0c0259))
* **storage-plugin:** Migrate to ESM ([#22590](https://github.com/appium/appium/issues/22590)) ([af8efc0](https://github.com/appium/appium/commit/af8efc0882b33e93d4188f4bd8f984da68ca5f2a))

### Bug Fixes

* **base-driver,storage-plugin:** redact sensitive payloads in debug logs ([#22549](https://github.com/appium/appium/issues/22549)) ([281e61c](https://github.com/appium/appium/commit/281e61c297f89e50a016051066cfcf808af9aaf2))


## [1.1.8](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.7...@appium/storage-plugin@1.1.8) (2026-07-25)


### Bug Fixes

* typescript config ([#22540](https://github.com/appium/appium/issues/22540)) ([ea6a2e1](https://github.com/appium/appium/commit/ea6a2e117f56c1d7ff459378700494407c51608e))
* Typescript references ([#22458](https://github.com/appium/appium/issues/22458)) ([fd70da7](https://github.com/appium/appium/commit/fd70da7ab407bf1f6fec8a3576b9a33f0aef9b69))



## [1.1.7](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.6...@appium/storage-plugin@1.1.7) (2026-06-18)

**Note:** Version bump only for package @appium/storage-plugin





## [1.1.6](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.5...@appium/storage-plugin@1.1.6) (2026-06-18)


### Bug Fixes

* **storage-plugin:** add fs.sanitizeName for the delete request as well ([#22362](https://github.com/appium/appium/issues/22362)) ([5fee017](https://github.com/appium/appium/commit/5fee01752f2782e96fbe64fd13520b433d4a7535))



## [1.1.5](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.4...@appium/storage-plugin@1.1.5) (2026-05-31)

**Note:** Version bump only for package @appium/storage-plugin





## [1.1.4](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.3...@appium/storage-plugin@1.1.4) (2026-05-07)

**Note:** Version bump only for package @appium/storage-plugin





## [1.1.3](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.2...@appium/storage-plugin@1.1.3) (2026-05-06)

**Note:** Version bump only for package @appium/storage-plugin





## [1.1.2](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.1...@appium/storage-plugin@1.1.2) (2026-05-06)

**Note:** Version bump only for package @appium/storage-plugin





## [1.1.1](https://github.com/appium/appium/compare/@appium/storage-plugin@1.1.0...@appium/storage-plugin@1.1.1) (2026-04-23)


### Bug Fixes

* All the rest of linter warnings ([#22183](https://github.com/appium/appium/issues/22183)) ([efe167f](https://github.com/appium/appium/commit/efe167f59a0a19515b78a53346e5d0b3fc4c744c))



## [1.1.0](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.6...@appium/storage-plugin@1.1.0) (2026-04-09)


### Features

* use exact version for dependencies in monorepo packages instead of ^ ([#22090](https://github.com/appium/appium/issues/22090)) ([86c8f23](https://github.com/appium/appium/commit/86c8f23a670d0bbc2d359a8235828606bd36e6aa))



## [1.0.6](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.5...@appium/storage-plugin@1.0.6) (2026-03-08)


### Bug Fixes

* Type imports ([#22025](https://github.com/appium/appium/issues/22025)) ([2f27425](https://github.com/appium/appium/commit/2f27425ea300ca1af1c1da6e4be68d48e7a94346))



## [1.0.5](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.4...@appium/storage-plugin@1.0.5) (2026-01-26)


### Bug Fixes

* apply npm run lint:fix ([#21867](https://github.com/appium/appium/issues/21867)) ([5e28714](https://github.com/appium/appium/commit/5e28714442cf59ee35b085e01e82c3f5483891fd))



## [1.0.4](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.3...@appium/storage-plugin@1.0.4) (2025-12-04)

**Note:** Version bump only for package @appium/storage-plugin





## [1.0.3](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.2...@appium/storage-plugin@1.0.3) (2025-11-12)

**Note:** Version bump only for package @appium/storage-plugin





## [1.0.2](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.1...@appium/storage-plugin@1.0.2) (2025-10-08)

**Note:** Version bump only for package @appium/storage-plugin





## [1.0.1](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.0...@appium/storage-plugin@1.0.1) (2025-09-09)

**Note:** Version bump only for package @appium/storage-plugin





## [1.0.0](https://github.com/appium/appium/compare/@appium/storage-plugin@1.0.0-rc.1...@appium/storage-plugin@1.0.0) (2025-08-18)

**Note:** Version bump only for package @appium/storage-plugin





## 1.0.0-rc.1 (2025-08-14)


### ⚠ BREAKING CHANGES

* set minimum Node.js version to v20.19.0 (#21394)

### Miscellaneous Chores

* set minimum Node.js version to v20.19.0 ([#21394](https://github.com/appium/appium/issues/21394)) ([37e22c4](https://github.com/appium/appium/commit/37e22c4f9c9920cea3f340841ab1b7c60e3147e9))



## [0.1.3](https://github.com/appium/appium/compare/@appium/storage-plugin@0.1.2...@appium/storage-plugin@0.1.3) (2025-06-01)

**Note:** Version bump only for package @appium/storage-plugin





## [0.1.2](https://github.com/appium/appium/compare/@appium/storage-plugin@0.1.1...@appium/storage-plugin@0.1.2) (2025-04-25)

**Note:** Version bump only for package @appium/storage-plugin





## [0.1.1](https://github.com/appium/appium/compare/@appium/storage-plugin@0.1.0...@appium/storage-plugin@0.1.1) (2025-03-17)

**Note:** Version bump only for package @appium/storage-plugin





## 0.1.0 (2025-03-11)


### Features

* Add storage plugin ([#21075](https://github.com/appium/appium/issues/21075)) ([ba4aa39](https://github.com/appium/appium/commit/ba4aa394d1b6676cc29644e7faa3b0590552f303))
* **storage-plugin:** Tune the files keeping behaviour ([#21086](https://github.com/appium/appium/issues/21086)) ([15280b8](https://github.com/appium/appium/commit/15280b80d2af6b3bdf6bf2905472b05b7bca1c1d))
