# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.14.3](https://github.com/appium/appium/compare/@appium/types@0.14.2...@appium/types@0.14.3) (2023-12-04)


### Bug Fixes

* **support:** update definitelytyped ([2c02be4](https://github.com/appium/appium/commit/2c02be440c21db0bf8a3832143e61ef8fb30a2cf))



## [0.14.2](https://github.com/appium/appium/compare/@appium/types@0.14.1...@appium/types@0.14.2) (2023-11-14)


### Bug Fixes

* **support:** update definitelytyped ([5ae8df3](https://github.com/appium/appium/commit/5ae8df3c36c7f03fbf3420087b532086f6742348))



## [0.14.1](https://github.com/appium/appium/compare/@appium/types@0.14.0...@appium/types@0.14.1) (2023-10-19)


### Bug Fixes

* **appium:** Make sure type definitions are always in sync across modules ([#19323](https://github.com/appium/appium/issues/19323)) ([de39013](https://github.com/appium/appium/commit/de39013ae501d4fc11988435737efb862cc1d820))
* **support:** update definitelytyped ([a306ce7](https://github.com/appium/appium/commit/a306ce741a806d21bc44f3b979803b8af5da99aa))



## [0.14.0](https://github.com/appium/appium/compare/@appium/types@0.13.4...@appium/types@0.14.0) (2023-10-18)


### Features

* **base-driver:** Add server support of TLS and SPDY protocols ([#19105](https://github.com/appium/appium/issues/19105)) ([5926919](https://github.com/appium/appium/commit/5926919177e3df675723c80d800f933fdbda5824))


### Bug Fixes

* **images-plugin:** update dependency lru-cache to v10 ([#19050](https://github.com/appium/appium/issues/19050)) ([72a806b](https://github.com/appium/appium/commit/72a806bec7c3a80747192d24dfd9d8286a751810))
* **support:** update definitelytyped ([3b44c7d](https://github.com/appium/appium/commit/3b44c7d8f5b89f9357dfe6bb56b54799bbe0a921))
* **support:** update definitelytyped ([595d460](https://github.com/appium/appium/commit/595d460ac8dc41d310f9e4f653acbad3c7fd50b9))
* **types:** update definitelytyped ([96b0a44](https://github.com/appium/appium/commit/96b0a44629c451102c44541a8d5b9e7be972f1ea))



## [0.13.4](https://github.com/appium/appium/compare/@appium/types@0.13.3...@appium/types@0.13.4) (2023-08-22)

**Note:** Version bump only for package @appium/types





## [0.13.3](https://github.com/appium/appium/compare/@appium/types@0.13.2...@appium/types@0.13.3) (2023-08-17)


### Bug Fixes

* **types:** update dependency type-fest to v3.13.1 ([fb34ab9](https://github.com/appium/appium/commit/fb34ab917216121d2b554677a12f07a03393d218))



## [0.13.2](https://github.com/appium/appium/compare/@appium/types@0.13.1...@appium/types@0.13.2) (2023-07-03)


### Bug Fixes

* **appium:** restrict address to ipv6/hostname ([#18824](https://github.com/appium/appium/issues/18824)) ([f09fbb6](https://github.com/appium/appium/commit/f09fbb64dce0e179a007f3a0ae9800e61fbe90eb)), closes [#18716](https://github.com/appium/appium/issues/18716)
* **types,base-driver:** remove deviceName from base constraints ([01061b2](https://github.com/appium/appium/commit/01061b291981333bdec59adfbea60f0cef3d69c1))
* **types:** ensure return type of deleteSession can always be void ([ee9b2a3](https://github.com/appium/appium/commit/ee9b2a30dee4a24b351375862883986e6d4e618c))
* **types:** fix signature of updateSettings ([24e7aec](https://github.com/appium/appium/commit/24e7aeca7dcab69e84e797e9e3168492d0e70e83))
* **types:** separate the type of opts from initialOpts ([d6cca51](https://github.com/appium/appium/commit/d6cca5175c3e55d4670936c9d216cd3a6610d16b))
* **types:** update some more types to reflect reality ([62f4244](https://github.com/appium/appium/commit/62f4244753b450eb0c9b96483a8b04a40ef289d2))



## [0.13.1](https://github.com/appium/appium/compare/@appium/types@0.13.0...@appium/types@0.13.1) (2023-06-29)

**Note:** Version bump only for package @appium/types





## [0.13.0](https://github.com/appium/appium/compare/@appium/types@0.12.0...@appium/types@0.13.0) (2023-06-15)


### ⚠ BREAKING CHANGES

* **types:** This changes the def of `findElOrEls` and `findElOrElsWithProcessing` in `ExternalDriver` in a breaking manner.

So conditional types don't work like how I was using them.  They work in capital-T-types (`type`), but they don't work as return values.  Instead, what we should have is an overload.  in this case, the function can be called one of two ways, and it returns a different thing depending on those values.  _unfortunately_ this is a little hinky to implement, given that overloads are unsupported in _object literals_.  they are supported in function statements or expressions, and they are supported in class definitions, but not object literals.  you'll see what needs to happen to make this work in `FakeDriver` and `BaseDriver` in subsequent changesets; essentially the function must be defined outside of the object literal and then stuffed in there.

The other change here changes an `object` type (which does not allow arbitrary properties) to a `StringRecord` type within the type which converts `Constraints` to `Capabilities`.  This affects caps for some drivers such as `chromedriverArgs` in `appium-android-driver`; anywhere where the constraint has `isObject: true`.

### Bug Fixes

* **types,fake-driver:** getLog doesn't necessarily return an array ([00ae162](https://github.com/appium/appium/commit/00ae1625d73305b8840d45a0dc98ac3cc628ac37))
* **types:** use overload instead of broken conditional type in findElOrEls ([63a5c22](https://github.com/appium/appium/commit/63a5c22127ab22acfde8d36e9b96bdd35614fe17))
* **types:** various fixes for reality ([81bc527](https://github.com/appium/appium/commit/81bc527be6aa54dd30a012156b5752b8b821ac0c))



## [0.12.0](https://github.com/appium/appium/compare/@appium/types@0.11.1...@appium/types@0.12.0) (2023-06-14)


### Features

* **appium:** Allow to provide ipv6 addresses and handle broadcast addresses in logs ([#18674](https://github.com/appium/appium/issues/18674)) ([8f63dab](https://github.com/appium/appium/commit/8f63dabb5dca882e522026f243e3445f5418874b))


### Bug Fixes

* **types:** update dependency type-fest to v3.11.0 ([19277f6](https://github.com/appium/appium/commit/19277f6e14a56e52b4669d633e148ad4a3da2c7a))
* **types:** update dependency type-fest to v3.11.1 ([56499eb](https://github.com/appium/appium/commit/56499eb997b551739bed628f057de7987674ea7f))



## [0.11.1](https://github.com/appium/appium/compare/@appium/types@0.11.0...@appium/types@0.11.1) (2023-05-17)


### Bug Fixes

* **types:** update dependency type-fest to v3.10.0 ([3c4d3ac](https://github.com/appium/appium/commit/3c4d3acc09d2ca1ed74dc77c18c62482e4c70239))
* **types:** update dependency type-fest to v3.9.0 ([94a207f](https://github.com/appium/appium/commit/94a207fc9718068f3657c51cc8be0ef682f16b11))



## [0.11.0](https://github.com/appium/appium/compare/@appium/types@0.10.4...@appium/types@0.11.0) (2023-04-14)


### ⚠ BREAKING CHANGES

* **types:** `Driver.proxyCommand` now returns `Promise<unknown>` by default.  In strict mode, this forces an extension calling `this.proxyCommand()` to explicitly type the return value (because it's unknown!).

Otherwise, this concerns the `SingularSessionData` type and the function which returns it (`getSession()`).  `Driver` now accepts a type param to add arbitrary properties to the value returned by `getSession()`--as this is in-line with `XCUITestDriver` is doing.  This param is provided as the new optional second type param to `SingularSessionData`.

Further, it removes the `ISessionCommands` interface, because I didn't understand how to write it such that an isolated implementation could use the type parameter from the class it belongs to. This is probably doable, but seems icky, and I didn't want to fight with it.  It's easier to just move the implementation into the class itself, which is what will happen in `BaseDriver` (see next changeset).

### Bug Fixes

* **types:** driver-specific session data now allowed ([91abd5b](https://github.com/appium/appium/commit/91abd5b598dd55e8d7fd12d2e683703aa8ac290a))



## [0.10.4](https://github.com/appium/appium/compare/@appium/types@0.10.3...@appium/types@0.10.4) (2023-04-10)


### Bug Fixes

* **types:** update dependency type-fest to v3.8.0 ([d6c42e9](https://github.com/appium/appium/commit/d6c42e99c08efce0b34796d5982ce379fca044d3))





## [0.10.3](https://github.com/appium/appium/compare/@appium/types@0.10.2...@appium/types@0.10.3) (2023-04-03)


### Bug Fixes

* **types:** make getContext & getContexts generic ([296c29a](https://github.com/appium/appium/commit/296c29ad8499d8ac132a785580d71617fdaf3e18))
* **types:** update dependency type-fest to v3.7.2 ([5580539](https://github.com/appium/appium/commit/55805390b5a0c6aa718bb357b30f66651f3db281))





## [0.10.2](https://github.com/appium/appium/compare/@appium/types@0.10.1...@appium/types@0.10.2) (2023-03-28)


### Bug Fixes

* **appium,types,base-driver,fake-driver,driver-test-support:** normalize constraint defaults ([3c9fa7b](https://github.com/appium/appium/commit/3c9fa7ba73b639e610e1f3d41d239a9402845b4c))
* backwards-compatible fixes for TS v5.x ([4974403](https://github.com/appium/appium/commit/49744036619ecc239e0e6255a13d38cafd709920))
* **base-driver,base-plugin,types:** update PluginCommand and DriverCommand types ([0dcd5fa](https://github.com/appium/appium/commit/0dcd5fa371af523c6527e55de4cff6cd472fde22))
* **base-driver,types:** fix websocket-related types on AppiumServer ([34891f5](https://github.com/appium/appium/commit/34891f56572f18dd740558b2348d8818680dc709))
* **types:** fix method map types ([5485f0b](https://github.com/appium/appium/commit/5485f0b9cd5c33dfeca61f1599edb40b2087479e))
* **types:** update dependency type-fest to v3.7.0 ([6912fa1](https://github.com/appium/appium/commit/6912fa14f2a7d338f17e1bed060e959de7aba1d6))
* **types:** update dependency type-fest to v3.7.1 ([bc860c7](https://github.com/appium/appium/commit/bc860c733a73760f0c42cbfb384e04d50c376d5e))





## [0.10.1](https://github.com/appium/appium/compare/@appium/types@0.10.0...@appium/types@0.10.1) (2023-03-08)


### Bug Fixes

* **types:** callback to implicitWaitForCondition accepts args ([5684c4e](https://github.com/appium/appium/commit/5684c4e2860d7f7043c6252f1e447a653b49955a))
* **types:** type fixes & improvements ([e2aa3d3](https://github.com/appium/appium/commit/e2aa3d3b32235072c99647c3a0bad5adc1965b22))
* **types:** update dependency type-fest to v3.6.1 ([471a4b5](https://github.com/appium/appium/commit/471a4b57e622ff077d59f577a78341268700c48d))





# [0.10.0](https://github.com/appium/appium/compare/@appium/types@0.9.1...@appium/types@0.10.0) (2023-02-24)


### Bug Fixes

* **types:** base cap webSocketUrl is now a boolean instead of a string. ([24fb515](https://github.com/appium/appium/commit/24fb515a52349058a8c9b69eafa531876880dffd))
* **types:** update dependency type-fest to v3.5.7 ([b4416c5](https://github.com/appium/appium/commit/b4416c5c0f40200b36909a1fbb492d8c4a212108))
* **types:** update dependency type-fest to v3.6.0 ([08a6f3a](https://github.com/appium/appium/commit/08a6f3a308c7ee162e992629888557b31e50a26e))


### Features

* **types:** add orientation type; add optional ELEMENT prop of Element ([ab5b285](https://github.com/appium/appium/commit/ab5b285714a804a3a665723e893b82bd93e25854))





## [0.9.1](https://github.com/appium/appium/compare/@appium/types@0.9.0...@appium/types@0.9.1) (2023-02-09)


### Bug Fixes

* **types:** update definitelytyped ([172bdae](https://github.com/appium/appium/commit/172bdae436efa75c5928972322d260184c225dd6))
* **types:** update dependency @types/express to v4.17.16 ([644f300](https://github.com/appium/appium/commit/644f300cd87edbf3788eb82c4c88f6b773e653b0))
* **types:** update dependency type-fest to v3.5.4 ([cfb5297](https://github.com/appium/appium/commit/cfb529772cff3a2b7e9ff36e12444b603906a769))
* **types:** update dependency type-fest to v3.5.5 ([9bf320c](https://github.com/appium/appium/commit/9bf320c87ccf574f933a8247a851b4f848c39fa1))
* **types:** update dependency type-fest to v3.5.6 ([775c990](https://github.com/appium/appium/commit/775c990f9d4176e78936a071968a788e19048519))





# [0.9.0](https://github.com/appium/appium/compare/@appium/types@0.8.3...@appium/types@0.9.0) (2023-01-23)


### Bug Fixes

* **types:** update dependency type-fest to v3.5.2 ([64fd8ce](https://github.com/appium/appium/commit/64fd8ce94018b0bb7ccb2baade8d525703f41c45))
* **types:** update dependency type-fest to v3.5.3 ([6c4ba8c](https://github.com/appium/appium/commit/6c4ba8caa508840640f05eea1ab41ecb290312aa))


### Features

* **base-plugin:** add ability for plugins to implement execute methods ([84abed9](https://github.com/appium/appium/commit/84abed920a1dc796ff09013ce86079de5a25fe50))





## [0.8.3](https://github.com/appium/appium/compare/@appium/types@0.8.2...@appium/types@0.8.3) (2023-01-13)

**Note:** Version bump only for package @appium/types





## [0.8.2](https://github.com/appium/appium/compare/@appium/types@0.8.1...@appium/types@0.8.2) (2023-01-13)

**Note:** Version bump only for package @appium/types





## [0.8.1](https://github.com/appium/appium/compare/@appium/types@0.8.0...@appium/types@0.8.1) (2023-01-13)

**Note:** Version bump only for package @appium/types





# [0.8.0](https://github.com/appium/appium/compare/@appium/types@0.7.0...@appium/types@0.8.0) (2023-01-13)


### Bug Fixes

* **types:** update dependency @types/ws to v8.5.4 ([6055f16](https://github.com/appium/appium/commit/6055f162d8781da99cbdff6859ca8af5a9538040))
* **types:** update dependency type-fest to v3.5.0 ([8c8bfe8](https://github.com/appium/appium/commit/8c8bfe824dbe062e24cfe9fc6e1afa2f68cc6e4c))
* **types:** update dependency type-fest to v3.5.1 ([4b5ab4d](https://github.com/appium/appium/commit/4b5ab4da7be925d0592c18e8f46a9ce30fbddf8e))


### Features

* **base-driver:** deprecate non-standard routes ([7055a0b](https://github.com/appium/appium/commit/7055a0b28193f677b21541ddada3c4a314f90f5b))
* **typedoc-appium-plugin:** implement cross-referencing of methods ([8b33414](https://github.com/appium/appium/commit/8b334149018f7d49448da9e7982356c72bcd468e))





# [0.7.0](https://github.com/appium/appium/compare/@appium/types@0.6.0...@appium/types@0.7.0) (2022-12-21)

### Bug Fixes

- add 'webSocketUrl' as standard cap for bidi support ([#17936](https://github.com/appium/appium/issues/17936)) ([0e195ca](https://github.com/appium/appium/commit/0e195caafefe911586ee2f8be4ae33d402b2ba40))
- **types:** update definitelytyped ([172fcb9](https://github.com/appium/appium/commit/172fcb9aff0afe5295650566c4fb92d0894bf879))
- **types:** update dependency type-fest to v3.4.0 ([37f71c3](https://github.com/appium/appium/commit/37f71c327a7c1a6d882b5198af6fedc9e8d51496))

### Features

- **base:** add get computed role and label in W3C v2 ([#17928](https://github.com/appium/appium/issues/17928)) ([316ecca](https://github.com/appium/appium/commit/316ecca8b1f8e52806867a15ba8524a504751460))

# [0.6.0](https://github.com/appium/appium/compare/@appium/types@0.5.0...@appium/types@0.6.0) (2022-12-14)

### Bug Fixes

- **appium,types:** cliArgs is never undefined ([e66dbb5](https://github.com/appium/appium/commit/e66dbb55cb43ecb4d01e8b9bf1cb8476a9e21639))
- **basedriver,types:** fix type problems ([226cd01](https://github.com/appium/appium/commit/226cd018b408ba93f737b7ae58646c2ba2375eb1))
- **schema:** add definition for log filters ([09c5901](https://github.com/appium/appium/commit/09c59017193b0fd839e41e44400872ab592d177a))
- **types:** generate constraints via babel ([96e30ad](https://github.com/appium/appium/commit/96e30ad5372af1a7659f546b45d23c6d9cda9490))
- **types:** update dependency type-fest to v3.2.0 ([f5da9f3](https://github.com/appium/appium/commit/f5da9f31a31b62d32b076857891cb027887fdbaf))
- **types:** update dependency type-fest to v3.3.0 ([33aef07](https://github.com/appium/appium/commit/33aef07d245627e67823a3b344cdf612e4452551))
- **types:** update webdriverio monorepo to v7.26.0 ([2a445ad](https://github.com/appium/appium/commit/2a445addffb5c972c7dcac50a1bf25601efa003d))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))
- **schema:** allow root $schema prop ([726a7e1](https://github.com/appium/appium/commit/726a7e10deadcc8150a549fb853fbf5cca033248))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

# [0.5.0](https://github.com/appium/appium/compare/@appium/types@0.4.1...@appium/types@0.5.0) (2022-10-13)

### Bug Fixes

- **types:** fix driverForSession declaration ([4d7d8e4](https://github.com/appium/appium/commit/4d7d8e4d38563aca5e9070ecab30aecad3205937))

### Features

- **types:** adds types to derive capabilities from constraints ([4abe910](https://github.com/appium/appium/commit/4abe91004d4089e4280494a6d285b074c33a43c1))

## [0.4.1](https://github.com/appium/appium/compare/@appium/types@0.4.0...@appium/types@0.4.1) (2022-09-07)

### Bug Fixes

- **types:** add inclusionCaseInsensitive to Constraint type ([74378cc](https://github.com/appium/appium/commit/74378cca66b365083850d189e5922de3a2c5f488))
- **types:** add missing @types/ws dep ([1597037](https://github.com/appium/appium/commit/159703744f18566bf3a46e0a2c5b9ac0073e5458))
- **types:** Driver extends ExecuteCommands ([#17363](https://github.com/appium/appium/issues/17363)) ([b594799](https://github.com/appium/appium/commit/b5947991cff4f78fd4e0de4155d10f47f75a19f9)), closes [#17359](https://github.com/appium/appium/issues/17359)

# [0.4.0](https://github.com/appium/appium/compare/@appium/types@0.3.1...@appium/types@0.4.0) (2022-08-10)

### Features

- **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)
- **base-driver,fake-driver,appium:** add convenience methods for defining execute script overloads ([#17321](https://github.com/appium/appium/issues/17321)) ([337ec3e](https://github.com/appium/appium/commit/337ec3e7ba216dd6f8cdc88143ecaa4c75f5d266))

## [0.3.1](https://github.com/appium/appium/compare/@appium/types@0.3.0...@appium/types@0.3.1) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

# [0.3.0](https://github.com/appium/appium/compare/@appium/types@0.2.5...@appium/types@0.3.0) (2022-07-28)

### Bug Fixes

- **appium,types:** include @appium/types in appium ([a0a6166](https://github.com/appium/appium/commit/a0a6166738f3db32f2512681914c4c5410cd4b28))

### Features

- **appium,base-driver,base-plugin,test-support,types:** move test fixtures into test-support ([70d88cb](https://github.com/appium/appium/commit/70d88cb86f28354efe313cc6be6a0afef20b38b3))

## [0.2.5](https://github.com/appium/appium/compare/@appium/types@0.2.4...@appium/types@0.2.5) (2022-05-31)

**Note:** Version bump only for package @appium/types

## [0.2.4](https://github.com/appium/appium/compare/@appium/types@0.2.3...@appium/types@0.2.4) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)
- **types,base-plugin:** fix static prop types for plugins ([2289b45](https://github.com/appium/appium/commit/2289b4527208c595b2758b9b14d86a2ab91ac15f))

## [0.2.3](https://github.com/appium/appium/compare/@appium/types@0.2.2...@appium/types@0.2.3) (2022-05-02)

**Note:** Version bump only for package @appium/types

## [0.2.2](https://github.com/appium/appium/compare/@appium/types@0.2.1...@appium/types@0.2.2) (2022-04-20)

**Note:** Version bump only for package @appium/types

## [0.2.1](https://github.com/appium/appium/compare/@appium/types@0.2.0...@appium/types@0.2.1) (2022-04-20)

**Note:** Version bump only for package @appium/types

# [0.2.0](https://github.com/appium/appium/compare/@appium/types@0.1.1...@appium/types@0.2.0) (2022-04-20)

### Bug Fixes

- **base-driver:** supportedLogTypes does not get overwritten ([ab6dfb3](https://github.com/appium/appium/commit/ab6dfb3158e192b42313d6b1d8648ffc672af8bd)), closes [#16738](https://github.com/appium/appium/issues/16738)
- **types:** fix declaration for AppiumServer['close'] ([b8df5b5](https://github.com/appium/appium/commit/b8df5b5c38a9e1741af3386acf49a842a82648fc))

### Features

- **base-driver:** Add a route for new window creation ([#16748](https://github.com/appium/appium/issues/16748)) ([78a4637](https://github.com/appium/appium/commit/78a46375aed016feb6e2b20299cc834d2d24e1cb))

## [0.1.1](https://github.com/appium/appium/compare/@appium/types@0.1.0...@appium/types@0.1.1) (2022-04-12)

**Note:** Version bump only for package @appium/types

# 0.1.0 (2022-04-07)

### Bug Fixes

- **base-driver:** Update/simplify the logic for logger prefix ([#16683](https://github.com/appium/appium/issues/16683)) ([a9651d3](https://github.com/appium/appium/commit/a9651d3c59caf0b1be1b85b5185192578925f3ac))
- **types:** add method for elementShadowRoot ([47b0df0](https://github.com/appium/appium/commit/47b0df06ecb6f0a66a0f70c71ede9755557dbc71))

### Features

- **base-driver:** Add more shadow root-related W3C routes ([#16700](https://github.com/appium/appium/issues/16700)) ([d8a9b4d](https://github.com/appium/appium/commit/d8a9b4da362c0ee3d1616595a9f652a59b178065))
- **types:** add new @appium/types package ([72085ca](https://github.com/appium/appium/commit/72085caa0a4030d8495fa1c66b092069aeebb20b))
