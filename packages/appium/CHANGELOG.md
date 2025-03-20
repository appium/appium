# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.17.1](https://github.com/appium/appium/compare/appium@2.17.0...appium@2.17.1) (2025-03-17)

**Note:** Version bump only for package appium



## [2.17.0](https://github.com/appium/appium/compare/appium@2.16.2...appium@2.17.0) (2025-03-11)


### Features

* **images-plugin:** supports image elements included in actions. ([#21055](https://github.com/appium/appium/issues/21055)) ([0c50504](https://github.com/appium/appium/commit/0c50504266eb5553dafd08bfb6161f643357114f))



## [2.16.2](https://github.com/appium/appium/compare/appium@2.16.1...appium@2.16.2) (2025-02-20)

**Note:** Version bump only for package appium





## [2.16.1](https://github.com/appium/appium/compare/appium@2.16.0...appium@2.16.1) (2025-02-20)

**Note:** Version bump only for package appium





## [2.16.0](https://github.com/appium/appium/compare/appium@2.15.0...appium@2.16.0) (2025-02-19)


### Features

* Add /appium/extensions API to list available extensions ([#20931](https://github.com/appium/appium/issues/20931)) ([a6b6077](https://github.com/appium/appium/commit/a6b6077ecd0749598f52d9f29b3220f47d7ad636))
* add /appium/sessions, /session/:sessionId/appium/capabilities and deprecated marks will be removed in the future ([#20936](https://github.com/appium/appium/issues/20936)) ([eeb59ca](https://github.com/appium/appium/commit/eeb59cab071fdafa44f091e9d0e2676414c85c5d))
* Add BiDi commands to the listCommands API output ([#20925](https://github.com/appium/appium/issues/20925)) ([2635dcb](https://github.com/appium/appium/commit/2635dcb457be2dc02dfbee5ad4c6ab132f5af8de))
* **appium:** Add a command line parameter to configure HTTP server request timeout ([#21003](https://github.com/appium/appium/issues/21003)) ([eb1b156](https://github.com/appium/appium/commit/eb1b156146bc338da9c6ded5a2c5beab22ac0ed8))
* **base-driver:** Add an API to list commands ([#20914](https://github.com/appium/appium/issues/20914)) ([059f1cb](https://github.com/appium/appium/commit/059f1cb698ccdbc58494af9303c5bf264a1893d9))


### Bug Fixes

* **appium:** add await for async function ([#20974](https://github.com/appium/appium/issues/20974)) ([21e2aab](https://github.com/appium/appium/commit/21e2aabc391fefe0dff8e29fe1cd6be908d5b3d0))
* **appium:** Wait for upstream web socket to open before sending data to it ([#20953](https://github.com/appium/appium/issues/20953)) ([3cfe3af](https://github.com/appium/appium/commit/3cfe3af1c8d88c8ec79d2d89c7e76d697205c86b))
* **execute-driver-plugin:** update dependency webdriverio to v9.5.3 ([#20895](https://github.com/appium/appium/issues/20895)) ([8741474](https://github.com/appium/appium/commit/874147449a26bbec03b08e7e95fb9e4c6b5881af))
* **execute-driver-plugin:** update dependency webdriverio to v9.5.4 ([#20898](https://github.com/appium/appium/issues/20898)) ([7f91d5c](https://github.com/appium/appium/commit/7f91d5cba850100124088d774ba8704e3765863f))
* **execute-driver-plugin:** update dependency webdriverio to v9.5.7 ([#20903](https://github.com/appium/appium/issues/20903)) ([c60fdc8](https://github.com/appium/appium/commit/c60fdc8d847b4aeed2d8b8307180194ee32e5ca9))
* **execute-driver-plugin:** update dependency webdriverio to v9.7.0 ([#20930](https://github.com/appium/appium/issues/20930)) ([5780982](https://github.com/appium/appium/commit/57809826a410b71dca155f59e081f77dcaf671ed))
* **execute-driver-plugin:** update dependency webdriverio to v9.7.1 ([#20934](https://github.com/appium/appium/issues/20934)) ([50fa5d6](https://github.com/appium/appium/commit/50fa5d670bd967200a78e5b4b8a54d5c9b85901b))
* **execute-driver-plugin:** update dependency webdriverio to v9.7.2 ([#20944](https://github.com/appium/appium/issues/20944)) ([f5e0819](https://github.com/appium/appium/commit/f5e0819f505b55421b7d260f69a41ae980390a91))
* **execute-driver-plugin:** update dependency webdriverio to v9.8.0 ([#20964](https://github.com/appium/appium/issues/20964)) ([ce32226](https://github.com/appium/appium/commit/ce32226cb57fb3f07bf4862dbbfcba227ff1230c))
* **execute-driver-plugin:** update dependency webdriverio to v9.9.0 ([#20994](https://github.com/appium/appium/issues/20994)) ([b3c877f](https://github.com/appium/appium/commit/b3c877f66ddf3ccf7a25ca1f7a3952c660bd7dda))
* **execute-driver-plugin:** update dependency webdriverio to v9.9.1 ([#20996](https://github.com/appium/appium/issues/20996)) ([c6a080f](https://github.com/appium/appium/commit/c6a080f7ade03a49a274ce6fbc84629406fdc2a7))
* **execute-driver-plugin:** update dependency webdriverio to v9.9.3 ([#21005](https://github.com/appium/appium/issues/21005)) ([686a630](https://github.com/appium/appium/commit/686a630fbdf525db16b42fdfc1bbdaf6426b41d0))
* **support:** update dependency semver to v7.7.0 ([#20948](https://github.com/appium/appium/issues/20948)) ([81ebd75](https://github.com/appium/appium/commit/81ebd758cb8a87d388124036e5158207041a6b2f))
* **support:** update dependency semver to v7.7.1 ([#20961](https://github.com/appium/appium/issues/20961)) ([4c08944](https://github.com/appium/appium/commit/4c089440e655fbe3c8da919f8f625b7d7179f00a))
* **types:** update dependency type-fest to v4.32.0 ([#20900](https://github.com/appium/appium/issues/20900)) ([fbc8530](https://github.com/appium/appium/commit/fbc85308a5398e7c9966792da713e60e47ed7f00))
* **types:** update dependency type-fest to v4.33.0 ([#20923](https://github.com/appium/appium/issues/20923)) ([2409d32](https://github.com/appium/appium/commit/2409d3223a77aa7e84e0cb05a70be3bfa0c69157))
* **types:** update dependency type-fest to v4.34.1 ([#20971](https://github.com/appium/appium/issues/20971)) ([0a7490e](https://github.com/appium/appium/commit/0a7490ed53ccfa9243df779e74bafadfc8415c87))
* **types:** update dependency type-fest to v4.35.0 ([#20999](https://github.com/appium/appium/issues/20999)) ([3dc7336](https://github.com/appium/appium/commit/3dc7336b5fce10b9c1b095cd7a8a1841dbc3de12))



## [2.15.0](https://github.com/appium/appium/compare/appium@2.14.1...appium@2.15.0) (2025-01-08)


### Features

* **appium,base-driver,base-plugin:** allow plugins to define custom bidi commands and emit bidi events ([#20876](https://github.com/appium/appium/issues/20876)) ([8df1c21](https://github.com/appium/appium/commit/8df1c217a15d30300c04b9f59cdbdffa70325828))



## [2.14.1](https://github.com/appium/appium/compare/appium@2.14.0...appium@2.14.1) (2025-01-06)


### Bug Fixes

* **appium:** Do not update BiDi commands for drivers which don't support it ([#20879](https://github.com/appium/appium/issues/20879)) ([13d8b03](https://github.com/appium/appium/commit/13d8b03cc185c5f4e0631002614981ee6f86fab4))
* **execute-driver-plugin:** update dependency webdriverio to v9.5.1 ([#20875](https://github.com/appium/appium/issues/20875)) ([93e4288](https://github.com/appium/appium/commit/93e4288253c07a844e6e10f0dd040b1a40eb92ff))
* **support:** update dependency teen_process to v2.2.3 ([#20882](https://github.com/appium/appium/issues/20882)) ([488e5de](https://github.com/appium/appium/commit/488e5dea82d3c525acf483952570e32f319f3722))



## [2.14.0](https://github.com/appium/appium/compare/appium@2.13.1...appium@2.14.0) (2025-01-02)


### Features

* **appium:** Add session.status BiDi command ([#20839](https://github.com/appium/appium/issues/20839)) ([64e768e](https://github.com/appium/appium/commit/64e768efb7bebd6b5a24d55206d1cad00812777c))
* **appium:** allow drivers to define their own bidi commands ([#20828](https://github.com/appium/appium/issues/20828)) ([a917ec6](https://github.com/appium/appium/commit/a917ec6ceda2166fb3dcbff6b2768f700db9e103))
* **appium:** Update entry point resolution logic for ESM extensions ([#20866](https://github.com/appium/appium/issues/20866)) ([bbfc040](https://github.com/appium/appium/commit/bbfc04026f0629d89d8b313616b852896481d08d))


### Bug Fixes

* **appium:** update CLI help messages ([#20825](https://github.com/appium/appium/issues/20825)) ([04e2d11](https://github.com/appium/appium/commit/04e2d1154b67c34607ab7a1e2a44b9b4bcfb998f))
* **docutils:** update dependency yaml to v2.7.0 ([#20870](https://github.com/appium/appium/issues/20870)) ([389a3e8](https://github.com/appium/appium/commit/389a3e83ac0069504338f7182a4e938cd391de7e))
* **execute-driver-plugin:** update dependency webdriverio to v9.4.5 ([#20847](https://github.com/appium/appium/issues/20847)) ([4474412](https://github.com/appium/appium/commit/4474412a60a82556f43fd3f3fb4f4ea2e4bc11ee))
* **execute-driver-plugin:** update dependency webdriverio to v9.5.0 ([#20871](https://github.com/appium/appium/issues/20871)) ([990a066](https://github.com/appium/appium/commit/990a0667e3442bf01aaf67327066517d6310c371))
* Reduce linter warnings ([#20860](https://github.com/appium/appium/issues/20860)) ([65658cc](https://github.com/appium/appium/commit/65658ccbdde9144c45cb5aad6a9089a5d6f3a0a3))
* **types:** update dependency type-fest to v4 ([#20838](https://github.com/appium/appium/issues/20838)) ([a5897dd](https://github.com/appium/appium/commit/a5897dd25a277a42b0c650a52274ba2c891ac3b0))
* **types:** update dependency type-fest to v4 ([#20843](https://github.com/appium/appium/issues/20843)) ([7abecad](https://github.com/appium/appium/commit/7abecaddd3ed64c7be321650b2a17990e74a7222))
* **types:** update dependency type-fest to v4.31.0 ([#20857](https://github.com/appium/appium/issues/20857)) ([24abb38](https://github.com/appium/appium/commit/24abb385e54f57457c4fb3f2b654cb63645e7ccd))



## [2.13.1](https://github.com/appium/appium/compare/appium@2.13.0...appium@2.13.1) (2024-12-05)


### Bug Fixes

* **docutils:** update dependency lilconfig to v3.1.3 ([#20803](https://github.com/appium/appium/issues/20803)) ([93fa5cc](https://github.com/appium/appium/commit/93fa5ccb06eb5089bb3e8a8d9e67dad7f4446a0a))
* **support:** update dependency axios to v1.7.9 ([#20811](https://github.com/appium/appium/issues/20811)) ([69f100a](https://github.com/appium/appium/commit/69f100ad3e12030708dee4b8a74005dd41976e37))
* **support:** update dependency teen_process to v2.2.2 ([#20808](https://github.com/appium/appium/issues/20808)) ([c91683f](https://github.com/appium/appium/commit/c91683f50feea937ff8568eab6366465a6cf9a3e))
* **types:** update dependency type-fest to v4.30.0 ([#20802](https://github.com/appium/appium/issues/20802)) ([8590432](https://github.com/appium/appium/commit/8590432955eb7663e35847db541b9ead3f845a36))



## [2.13.0](https://github.com/appium/appium/compare/appium@2.12.2...appium@2.13.0) (2024-12-02)


### Features

* **base-driver:** Allow to prefix feature names with automation names ([#20793](https://github.com/appium/appium/issues/20793)) ([942057d](https://github.com/appium/appium/commit/942057d26cbf51539f34b6b7ff8a3c1d07821687))


### Bug Fixes

* **types:** update dependency type-fest to v4.29.1 ([#20795](https://github.com/appium/appium/issues/20795)) ([6ba31fe](https://github.com/appium/appium/commit/6ba31fe5766f69cb010a4cac81233f4c3cbcf80f))



## [2.12.2](https://github.com/appium/appium/compare/appium@2.12.1...appium@2.12.2) (2024-11-29)


### Bug Fixes

* **appium:** correctly handle git/github install types (fix [#20781](https://github.com/appium/appium/issues/20781)) ([#20788](https://github.com/appium/appium/issues/20788)) ([522f05d](https://github.com/appium/appium/commit/522f05d25ecdf65e2ae22bd7830a250346fc5752))
* **appium:** update dependency winston to v3.16.0 ([275da08](https://github.com/appium/appium/commit/275da089e45daba030fbc53d3943e2a9929b27e4))
* **appium:** update dependency winston to v3.17.0 ([#20736](https://github.com/appium/appium/issues/20736)) ([f91d8c8](https://github.com/appium/appium/commit/f91d8c8812b77c8739b23d4d49c15a44e19cbcbe))
* **docutils:** update dependency yaml to v2.6.1 ([#20762](https://github.com/appium/appium/issues/20762)) ([a5389e6](https://github.com/appium/appium/commit/a5389e648af22570a55e70de71c159874362ffd9))
* **support:** update dependency axios to v1.7.8 ([#20778](https://github.com/appium/appium/issues/20778)) ([f9920e2](https://github.com/appium/appium/commit/f9920e2c1b02e3587e5d5fa00ac59055ab57fedd))
* **types:** update dependency type-fest to v4.27.0 ([#20754](https://github.com/appium/appium/issues/20754)) ([d6b4079](https://github.com/appium/appium/commit/d6b40797d387711df94c29984af91308da27f92b))
* **types:** update dependency type-fest to v4.28.0 ([#20775](https://github.com/appium/appium/issues/20775)) ([a25d8f1](https://github.com/appium/appium/commit/a25d8f129c8baf76ab40ce3b8d053f7da77f14b3))
* **types:** update dependency type-fest to v4.29.0 ([#20783](https://github.com/appium/appium/issues/20783)) ([b6aa5ac](https://github.com/appium/appium/commit/b6aa5ace6e54709dba54bc62a902d91851ab7ef1))



## [2.12.1](https://github.com/appium/appium/compare/appium@2.12.0...appium@2.12.1) (2024-10-24)


### Bug Fixes

* **docutils:** restore support for Python <3.12 ([#20675](https://github.com/appium/appium/issues/20675)) ([00cd1b4](https://github.com/appium/appium/commit/00cd1b4b0fcf24d0014dac780223e5866f39c9ce))
* **support:** update definitelytyped ([#20691](https://github.com/appium/appium/issues/20691)) ([846dd52](https://github.com/appium/appium/commit/846dd5288608d886f924d2791291475c956d53f7))



## [2.12.0](https://github.com/appium/appium/compare/appium@2.11.5...appium@2.12.0) (2024-10-15)


### Features

* **appium:** Make server graceful shutdown timeout configurable via command line args ([#20641](https://github.com/appium/appium/issues/20641)) ([5661888](https://github.com/appium/appium/commit/56618886ed007df3c28ce98beb4ff91bc47da2a2))


### Bug Fixes

* **appium:** update dependency winston to v3.15.0 ([ab12235](https://github.com/appium/appium/commit/ab12235483262a1c5a1dd8a32b1792a4b096bfc6))
* **docutils:** support Python 3.12+ ([#20666](https://github.com/appium/appium/issues/20666)) ([8d7cec9](https://github.com/appium/appium/commit/8d7cec96d8df60644493a7e2f735b4bb0d3783be))
* **docutils:** update dependency yaml to v2.6.0 ([ed6c6dd](https://github.com/appium/appium/commit/ed6c6dd5441e26fc1eb58de9b78def49d930a128))
* **execute-driver-plugin:** update dependency webdriverio to v8.40.6 ([796ca9f](https://github.com/appium/appium/commit/796ca9f98f69616b9c890325bbfb0c573a8bc765))



## [2.11.5](https://github.com/appium/appium/compare/appium@2.11.4...appium@2.11.5) (2024-09-26)


### Bug Fixes

* **appium:** Return hostname as web socket url for BiDi if a broadcast address is assigned to the server ([#20603](https://github.com/appium/appium/issues/20603)) ([f0de55d](https://github.com/appium/appium/commit/f0de55da0da2fc0305876a948704c1f0a2a5990f))



## [2.11.4](https://github.com/appium/appium/compare/appium@2.11.3...appium@2.11.4) (2024-09-16)


### Bug Fixes

* **appium:** Fix the condition for secure websocket ([#20497](https://github.com/appium/appium/issues/20497)) ([efdb1ce](https://github.com/appium/appium/commit/efdb1ce6ce1de5120f2f35ebe84abfa73ed5198a))
* **appium:** update dependency @sidvind/better-ajv-errors to v3 ([#20552](https://github.com/appium/appium/issues/20552)) ([0ee7716](https://github.com/appium/appium/commit/0ee7716cf0644cfc6795f0949d8253d4c0b36597))
* **appium:** update dependency winston to v3.14.2 ([#20465](https://github.com/appium/appium/issues/20465)) ([893fc04](https://github.com/appium/appium/commit/893fc040e16ec07c83d12c7c89180d962b0f6e68))
* **base-driver:** Add a server flag to check if it operates a secure protocol ([#20449](https://github.com/appium/appium/issues/20449)) ([622b245](https://github.com/appium/appium/commit/622b245ea38793280d9785a59a0416ce025862fe))
* **docutils:** update dependency yaml to v2.5.1 ([750872a](https://github.com/appium/appium/commit/750872af4756d2efcd19fe98762f82ecaa59d59a))
* **execute-driver-plugin:** update dependency webdriverio to v8.40.3 ([4608563](https://github.com/appium/appium/commit/46085635a92c3a2b2b1b3ecf3966a174248a2829))
* **execute-driver-plugin:** update dependency webdriverio to v8.40.5 ([dcb6de2](https://github.com/appium/appium/commit/dcb6de22eaabdcea2517cd9b7db120d681f0e38e))
* **support:** update dependency axios to v1.7.4 ([d17d022](https://github.com/appium/appium/commit/d17d0222245ab94a78e578c0398734e65a89ba68))
* **support:** update dependency axios to v1.7.5 ([fedabb1](https://github.com/appium/appium/commit/fedabb1fdc7af10f9e4b06ea23815c4bc7c6bf5e))
* **support:** update dependency axios to v1.7.7 ([7fe67a2](https://github.com/appium/appium/commit/7fe67a286a15a917ce3b1b47a08e982e65bbd9e4))
* **types:** update dependency type-fest to v4 ([#20467](https://github.com/appium/appium/issues/20467)) ([482a1f7](https://github.com/appium/appium/commit/482a1f7bbfbf6478ee09bb1668b830ddbf13b143))
* **types:** update dependency type-fest to v4 ([#20471](https://github.com/appium/appium/issues/20471)) ([9a66f48](https://github.com/appium/appium/commit/9a66f4800141cc86c90d58ca1103bab0066081bc))
* **types:** update dependency type-fest to v4 ([#20548](https://github.com/appium/appium/issues/20548)) ([5b8cb76](https://github.com/appium/appium/commit/5b8cb76ea3cda75095e79c91539be73feeadf869))
* **types:** update dependency type-fest to v4.26.0 ([#20511](https://github.com/appium/appium/issues/20511)) ([8f20c97](https://github.com/appium/appium/commit/8f20c973f4a6d3380163b6afd7f113808453a62d))



## [2.11.3](https://github.com/appium/appium/compare/appium@2.11.2...appium@2.11.3) (2024-08-07)


### Bug Fixes

* **appium:** update dependency ajv to v8.17.1 ([7528971](https://github.com/appium/appium/commit/75289711ee344ac9a11a572f13ddb0471e2cbf79))
* **appium:** update dependency winston to v3.13.1 ([dcfec17](https://github.com/appium/appium/commit/dcfec17d1ceab90939b5f199854ba630829e3d1f))
* **docutils:** update dependency yaml to v2.5.0 ([0c755f5](https://github.com/appium/appium/commit/0c755f503c49e459315616e51be0c0776089b2bb))
* **execute-driver-plugin:** update dependency webdriverio to v8.40.0 ([#20442](https://github.com/appium/appium/issues/20442)) ([b4612e0](https://github.com/appium/appium/commit/b4612e0c7a21902a3cab658fbdc05f3b48c55d0d))
* **logger:** update dependency lru-cache to v10.4.3 ([#20364](https://github.com/appium/appium/issues/20364)) ([8d79467](https://github.com/appium/appium/commit/8d79467da8a0733ac3e49b9152bd6905989a57ca))
* **support:** update dependency axios to v1.7.3 ([1ca77c6](https://github.com/appium/appium/commit/1ca77c6dedbff4552aba9c97cf5406c7552d1a01))
* **support:** update dependency semver to v7.6.3 ([5a9ab97](https://github.com/appium/appium/commit/5a9ab9792402e31d3903fb1a3b08329a67b6a2a2))
* **types:** update dependency type-fest to v4.22.0 ([#20387](https://github.com/appium/appium/issues/20387)) ([47405dd](https://github.com/appium/appium/commit/47405dda8a5de17c72fb721b0c043e0dd4f6b35a))
* **types:** update dependency type-fest to v4.23.0 ([#20396](https://github.com/appium/appium/issues/20396)) ([0e8e3c7](https://github.com/appium/appium/commit/0e8e3c71441d02d22f015f08df5223909f5fbb93))



## [2.11.2](https://github.com/appium/appium/compare/appium@2.11.1...appium@2.11.2) (2024-07-10)


### Bug Fixes

* **appium:** update dependency ws to v8.18.0 ([44e4231](https://github.com/appium/appium/commit/44e423110ad6c8bd7d846cc334fafe931fea43f9))
* **execute-driver-plugin:** update dependency webdriverio to v8.39.1 ([c2f3a61](https://github.com/appium/appium/commit/c2f3a618e413c7f21057ba6d9002dc1fe4507e6f))
* **support:** update dependency teen_process to v2.1.10 ([86f843b](https://github.com/appium/appium/commit/86f843b9e1fc56576d7a08bf95838a58971e98b3))
* **support:** update dependency teen_process to v2.1.7 ([5226fa8](https://github.com/appium/appium/commit/5226fa897b90e9fec9be3e79a7d48fc7b4e0016d))
* **support:** update dependency teen_process to v2.2.0 ([06607da](https://github.com/appium/appium/commit/06607da92e93d015747fd6d6d5bdabe1b3ac58d2))
* **types:** update dependency type-fest to v4.21.0 ([#20335](https://github.com/appium/appium/issues/20335)) ([8894b9a](https://github.com/appium/appium/commit/8894b9adf709646108cc8d6426bbb690550609f2))



## [2.11.1](https://github.com/appium/appium/compare/appium@2.11.0...appium@2.11.1) (2024-06-28)


### Bug Fixes

* **images-plugin:** update dependency lru-cache to v10.3.0 ([#20306](https://github.com/appium/appium/issues/20306)) ([e43c7a4](https://github.com/appium/appium/commit/e43c7a4dce1f50fbd4d028cbeac5677422210b20))



## [2.11.0](https://github.com/appium/appium/compare/appium@2.10.3...appium@2.11.0) (2024-06-27)


### Features

* **appium:** Improve context logging ([#20250](https://github.com/appium/appium/issues/20250)) ([f675abc](https://github.com/appium/appium/commit/f675abc27b3e6beac2431cc71afb5fc2c2f70534))
* **appium:** show extension update info message for newer major versions ([#20283](https://github.com/appium/appium/issues/20283)) ([f2c8b69](https://github.com/appium/appium/commit/f2c8b696085ba862553476f23509cac0674a447c))
* **appium:** show spinner during extension uninstall ([#20282](https://github.com/appium/appium/issues/20282)) ([f250793](https://github.com/appium/appium/commit/f25079354bfd646810813ae47244a1e2e962dbfb))


### Bug Fixes

* **appium:** update dependency ws to v8.17.1 ([d2b24da](https://github.com/appium/appium/commit/d2b24daba056373160d680ec5f017b28e9cbde1a))
* **execute-driver-plugin:** update dependency webdriverio to v8.39.0 ([faf9623](https://github.com/appium/appium/commit/faf9623a65868a6330d062076074da7c1c3acb2a))
* **support:** update dependency teen_process to v2.1.5 ([bc388db](https://github.com/appium/appium/commit/bc388db1116f411f4b241105f5feae30418c9a27))
* **support:** update dependency teen_process to v2.1.6 ([5412461](https://github.com/appium/appium/commit/541246184dc7521c825ec1902775e681ea6f0db3))
* **types:** update dependency type-fest to v4.20.1 ([#20255](https://github.com/appium/appium/issues/20255)) ([1984553](https://github.com/appium/appium/commit/19845531f558e2b16dfae807c768e1b9f2cab25d))



## [2.10.3](https://github.com/appium/appium/compare/appium@2.10.2...appium@2.10.3) (2024-06-11)

**Note:** Version bump only for package appium





## [2.10.2](https://github.com/appium/appium/compare/appium@2.10.1...appium@2.10.2) (2024-06-11)

**Note:** Version bump only for package appium





## [2.10.1](https://github.com/appium/appium/compare/appium@2.10.0...appium@2.10.1) (2024-06-11)

**Note:** Version bump only for package appium





## [2.10.0](https://github.com/appium/appium/compare/appium@2.9.0...appium@2.10.0) (2024-06-10)


### Features

* **appium:** Add a possibility to print logs in json format ([#20224](https://github.com/appium/appium/issues/20224)) ([1e86537](https://github.com/appium/appium/commit/1e86537e944f6beb7dbe72b35c267ae1dd9ebd36))
* **appium:** Add session signature to all logs ([#20202](https://github.com/appium/appium/issues/20202)) ([#20214](https://github.com/appium/appium/issues/20214)) ([0363aab](https://github.com/appium/appium/commit/0363aab8ba4fe0ec49845db2f493001aa873578b)), closes [#20222](https://github.com/appium/appium/issues/20222)
* **logger:** Add the debug level to the default logger ([#20219](https://github.com/appium/appium/issues/20219)) ([8ee7d07](https://github.com/appium/appium/commit/8ee7d07af4e2375d2eb7c23badaaac34685bc59c))
* **support:** Move SecureValuesPreprocessor to @appum/logger ([#20228](https://github.com/appium/appium/issues/20228)) ([dbc3b66](https://github.com/appium/appium/commit/dbc3b668a0a7a815d23f1cae4207d435fc09034d))


### Bug Fixes

* **docutils:** update dependency lilconfig to v3.1.2 ([1828501](https://github.com/appium/appium/commit/1828501c66d0c5f8f295c67cd12d6691f8020780))
* **docutils:** update dependency yaml to v2.4.5 ([6a08c95](https://github.com/appium/appium/commit/6a08c95fc9bda5cf39b8a6d98e5394658355a38e))
* **types:** update dependency type-fest to v4.20.0 ([#20227](https://github.com/appium/appium/issues/20227)) ([ea00626](https://github.com/appium/appium/commit/ea00626091e3ce87f6e3ed7a61003295272835e3))



## [2.9.0](https://github.com/appium/appium/compare/appium@2.8.0...appium@2.9.0) (2024-06-06)


### Features

* **appium:** Add session signature to all logs ([#20202](https://github.com/appium/appium/issues/20202)) ([b3f8a47](https://github.com/appium/appium/commit/b3f8a47c2d3fa029bdb5592d7130c6d1664e53b5))


### Bug Fixes

* **appium:** Revert changes in 20203 and 20202 ([#20209](https://github.com/appium/appium/issues/20209)) ([40def9d](https://github.com/appium/appium/commit/40def9dbdbde64706111900967d66735257b7404)), closes [#20202](https://github.com/appium/appium/issues/20202) [#20203](https://github.com/appium/appium/issues/20203)



## [2.8.0](https://github.com/appium/appium/compare/appium@2.7.0...appium@2.8.0) (2024-06-06)


### Features

* **logger:** Add the 'debug' level to the default logger ([#20203](https://github.com/appium/appium/issues/20203)) ([7fd9d5f](https://github.com/appium/appium/commit/7fd9d5f6261b385c234580c2bfee4d576905458b))


### Bug Fixes

* add logger dependencies in package.json ([#20205](https://github.com/appium/appium/issues/20205)) ([3fbc4f1](https://github.com/appium/appium/commit/3fbc4f1fe07eadf9c7a2ef8fc9f4ba78dc3486a3))



## [2.7.0](https://github.com/appium/appium/compare/appium@2.6.0...appium@2.7.0) (2024-06-06)


### Features

* **appium:** Replace npmlog with the local fork ([#20190](https://github.com/appium/appium/issues/20190)) ([8915934](https://github.com/appium/appium/commit/8915934270243bfb46c4d104a098ce1cc481b0ff))
* **base-driver:** Make addition of search query params to cache optional ([#20195](https://github.com/appium/appium/issues/20195)) ([21316e9](https://github.com/appium/appium/commit/21316e94d05b2f97aa0349a82da229713e92446c))


### Bug Fixes

* **appium:** ensure ws close code is valid ([#20178](https://github.com/appium/appium/issues/20178)) ([65c47ac](https://github.com/appium/appium/commit/65c47acf5954bbf1947e896ef79c81a9b3c712a5))
* **appium:** update dependency ajv to v8.16.0 ([ae7f74a](https://github.com/appium/appium/commit/ae7f74a0144d233653443622a84d49b1cb4e6222))
* **docutils:** update dependency yaml to v2.4.3 ([848eb00](https://github.com/appium/appium/commit/848eb00afbd1cab76a6a1c3d0f4a2a0b1acee0d0))
* **execute-driver-plugin:** update dependency webdriverio to v8.38.2 ([c8f9979](https://github.com/appium/appium/commit/c8f997973cc21673f95d02c92d43a2981b8713b8))
* **support:** update dependency teen_process to v2.1.4 ([96a7a3f](https://github.com/appium/appium/commit/96a7a3f23bead7c1d18700550138cd2d70ce5e3c))
* **types:** update dependency type-fest to v4.19.0 ([#20193](https://github.com/appium/appium/issues/20193)) ([db62358](https://github.com/appium/appium/commit/db62358dbac25de2a75fdc7493338d98b1422c84))



## [2.6.0](https://github.com/appium/appium/compare/appium@2.5.4...appium@2.6.0) (2024-05-27)


### Features

* **appium:** Add --show-debug-info CLI argument ([#20108](https://github.com/appium/appium/issues/20108)) ([6f602d3](https://github.com/appium/appium/commit/6f602d3e501dbd9d44f6e7ba220f45ff1d4dfde8))
* **appium:** prepare setup subcommand as shortcut for drivers/plugins installation ([#20102](https://github.com/appium/appium/issues/20102)) ([2b2fb18](https://github.com/appium/appium/commit/2b2fb185a6bc882717e4aa0580b0136bf5ae2942))
* **base-driver:** Add env variables to control applications cache ([#20042](https://github.com/appium/appium/issues/20042)) ([4e8c91c](https://github.com/appium/appium/commit/4e8c91c8f647e545344d5b49282628413e1ccb19))


### Bug Fixes

* **appium:** Do not crash the process if there was an exception in a winston transport ([#20065](https://github.com/appium/appium/issues/20065)) ([0492fe4](https://github.com/appium/appium/commit/0492fe49dc34b3ef345a988bf56e49daf8dfcffe))
* **appium:** update dependency ajv to v8.13.0 ([448e94e](https://github.com/appium/appium/commit/448e94ee50fa127ae93e657a3958726aa13e7df8))
* **appium:** update dependency ajv to v8.14.0 ([e3dcd66](https://github.com/appium/appium/commit/e3dcd66714be603a8acbb3364f538c60772e76bd))
* **appium:** update dependency ws to v8.17.0 ([395dc22](https://github.com/appium/appium/commit/395dc225e4d7f47dc55134fba9fb9306cabf7e19))
* **docutils:** update dependency yaml to v2.4.2 ([0211174](https://github.com/appium/appium/commit/0211174300cf91c1cad2364d8ce3de7100139f5c))
* **execute-driver-plugin:** update dependency webdriverio to v8.37.0 ([27ff9a0](https://github.com/appium/appium/commit/27ff9a00ef65a66aea8da8e3be5ffebb6d8c65e1))
* **execute-driver-plugin:** update dependency webdriverio to v8.38.0 ([e80b682](https://github.com/appium/appium/commit/e80b6826efbe14ecfa6c0ff1f6aceb4db99b82d8))
* **support:** update dependency axios to v1.7.1 ([11510cb](https://github.com/appium/appium/commit/11510cb1a5d50a20ced884e5404d0be1e04ff142))
* **support:** update dependency axios to v1.7.2 ([a876f11](https://github.com/appium/appium/commit/a876f112b51dd25f70094b9e75330b9558050e42))
* **support:** update dependency semver to v7.6.1 ([b5fd5b6](https://github.com/appium/appium/commit/b5fd5b6d2c585be8391b80ac67207da610e8ea64))
* **support:** update dependency semver to v7.6.2 ([1b4f36c](https://github.com/appium/appium/commit/1b4f36cebe7aaf99976f24346b2d1325b79fc55c))
* **support:** update dependency teen_process to v2.1.3 ([b34ce3c](https://github.com/appium/appium/commit/b34ce3cff0279be5bb5dcb9228f7e058d27a5e72))
* **types:** update dependency type-fest to v4.18.2 ([#20103](https://github.com/appium/appium/issues/20103)) ([3b43be1](https://github.com/appium/appium/commit/3b43be17321f2ca16bac0abedabf9ef8cffa098a))
* **types:** update dependency type-fest to v4.18.3 ([#20149](https://github.com/appium/appium/issues/20149)) ([d5369f8](https://github.com/appium/appium/commit/d5369f8b08e7439282c5a211e684b154cc9f0051))



## [2.5.4](https://github.com/appium/appium/compare/appium@2.5.3...appium@2.5.4) (2024-04-21)


### Bug Fixes

* **execute-driver-plugin:** update dependency webdriverio to v8.36.1 ([9ad20ff](https://github.com/appium/appium/commit/9ad20ff1c266923f3efe50bfe2ae4b1ab8ecb20a))



## [2.5.3](https://github.com/appium/appium/compare/appium@2.5.2...appium@2.5.3) (2024-04-16)


### Bug Fixes

* **execute-driver-plugin:** update dependency webdriverio to v8.36.0 ([#19998](https://github.com/appium/appium/issues/19998)) ([72f3284](https://github.com/appium/appium/commit/72f32848b68e6ef8c047f700ffd0be7d68c49aba))



## [2.5.2](https://github.com/appium/appium/compare/appium@2.5.1...appium@2.5.2) (2024-04-08)


### Bug Fixes

* **appium:** make --log-filters work ([#19825](https://github.com/appium/appium/issues/19825)) ([0d5a0a5](https://github.com/appium/appium/commit/0d5a0a572787d913412bbfd70835e5ba8f94334c))
* **appium:** update definitelytyped ([2687fa4](https://github.com/appium/appium/commit/2687fa47a0c2f11983e5ccb2ee17eaae9279469d))
* **appium:** update definitelytyped ([68456b8](https://github.com/appium/appium/commit/68456b8aea3c6ae7225814748fb36d9d4117cc9f))
* **appium:** update dependency ajv-formats to v3 ([#19957](https://github.com/appium/appium/issues/19957)) ([59ef09d](https://github.com/appium/appium/commit/59ef09d9558f1a6a9f4ee3d81d4cb0b7218706b4))
* **appium:** update dependency winston to v3.12.0 ([8eb4e88](https://github.com/appium/appium/commit/8eb4e888f624acfc1d42977eeda2d4c1ae139efc))
* **appium:** update dependency winston to v3.13.0 ([03f8dc9](https://github.com/appium/appium/commit/03f8dc9b18f226975f025ceda7e1d907de8b45d5))
* **docutils:** update dependency lilconfig to v3.1.0 ([f92640a](https://github.com/appium/appium/commit/f92640a824644545b680e23c7f3ec7f51de9df98))
* **docutils:** update dependency lilconfig to v3.1.1 ([e04e4e9](https://github.com/appium/appium/commit/e04e4e902a212cf17ca79b3edc0b7545a1af507b))
* **docutils:** update dependency typescript to v5.4.2 ([#19876](https://github.com/appium/appium/issues/19876)) ([2448fa0](https://github.com/appium/appium/commit/2448fa0145620657ccc72b5637f1b7737fe52580))
* **docutils:** update dependency yaml to v2.4.0 ([26ded7a](https://github.com/appium/appium/commit/26ded7a4cce1fa9bca28521e4b60cad0edacbe96))
* **docutils:** update dependency yaml to v2.4.1 ([636d6b3](https://github.com/appium/appium/commit/636d6b3802268ec6532f9f3a958f304c6760d172))
* **execute-driver-plugin:** update dependency webdriverio to v8.32.0 ([d25a0fc](https://github.com/appium/appium/commit/d25a0fca9b3a94880525fd956068f59427a40b26))
* **execute-driver-plugin:** update dependency webdriverio to v8.32.1 ([ea8c74b](https://github.com/appium/appium/commit/ea8c74b372e73e88cf0303aa17db943014416e64))
* **execute-driver-plugin:** update dependency webdriverio to v8.32.2 ([#19807](https://github.com/appium/appium/issues/19807)) ([6c034aa](https://github.com/appium/appium/commit/6c034aa84af573d36fa934c71d3d4ff328772553))
* **execute-driver-plugin:** update dependency webdriverio to v8.32.3 ([f837a6a](https://github.com/appium/appium/commit/f837a6a9eaf34914ffdbfddcc3cb2f7e7427bc63))
* **execute-driver-plugin:** update dependency webdriverio to v8.32.4 ([7516d41](https://github.com/appium/appium/commit/7516d4135a1eec37ba298f407254d825961795af))
* **execute-driver-plugin:** update dependency webdriverio to v8.33.1 ([#19877](https://github.com/appium/appium/issues/19877)) ([0e6c3ee](https://github.com/appium/appium/commit/0e6c3eede250193fad390387ec494918367176d9))
* **execute-driver-plugin:** update dependency webdriverio to v8.34.1 ([7fc7446](https://github.com/appium/appium/commit/7fc7446612f3257fa421dfec006d02730df10f59))
* **execute-driver-plugin:** update dependency webdriverio to v8.35.1 ([63d7550](https://github.com/appium/appium/commit/63d7550d02f049a5c3bea5d27e7e8385d7698a4f))
* **support:** update dependency @types/semver to v7.5.8 ([d1705e2](https://github.com/appium/appium/commit/d1705e2818d435b4c37cb70753af1de5427378e2))
* **support:** update dependency axios to v1.6.8 ([bd6ab81](https://github.com/appium/appium/commit/bd6ab81c9408ab0f90fc25fc112f9257ec2973ad))



## [2.5.1](https://github.com/appium/appium/compare/appium@2.5.0...appium@2.5.1) (2024-02-13)


### Bug Fixes

* **execute-driver-plugin:** update dependency webdriverio to v8.31.1 ([db0eec0](https://github.com/appium/appium/commit/db0eec05c58fe970351a309a01507cad824bdad2))
* **support:** update dependency @types/semver to v7.5.7 ([bd8a92f](https://github.com/appium/appium/commit/bd8a92f588d40c97fbe51f8bd3b7835c96e9fe8f))
* **support:** update dependency semver to v7.6.0 ([7b40a32](https://github.com/appium/appium/commit/7b40a3225ebe0f5976a26d05db2f22ba7b13a130))



## [2.5.0](https://github.com/appium/appium/compare/appium@2.4.1...appium@2.5.0) (2024-02-06)


### Features

* **appium:** Set a proper exit code if any of required doctor checks fails ([#19617](https://github.com/appium/appium/issues/19617)) ([f4011f1](https://github.com/appium/appium/commit/f4011f17d4d03bc854c43462848a4c38427acb85))


### Bug Fixes

* **appium:** Tune warning messages about installed extensions ([#19612](https://github.com/appium/appium/issues/19612)) ([5cd9ca5](https://github.com/appium/appium/commit/5cd9ca5c21393c70d259f7525d2c9d35b7eeb2a2))
* **execute-driver-plugin:** update dependency webdriverio to v8.27.2 ([35f1dba](https://github.com/appium/appium/commit/35f1dbabf6e852c4ae84ec128879bc7e61321a16))
* **execute-driver-plugin:** update dependency webdriverio to v8.28.0 ([e8e0444](https://github.com/appium/appium/commit/e8e0444bd28d94963090065a813a4b10be665caa))
* **execute-driver-plugin:** update dependency webdriverio to v8.28.6 ([da84efc](https://github.com/appium/appium/commit/da84efc42dd62b2be07a52dd4379791e2cef6eb2))
* **execute-driver-plugin:** update dependency webdriverio to v8.28.8 ([1fdf117](https://github.com/appium/appium/commit/1fdf117c63f6e9871f4de3c0bd93ecbdb13a9235))
* **execute-driver-plugin:** update dependency webdriverio to v8.29.0 ([6f0101e](https://github.com/appium/appium/commit/6f0101eb6343eb8b372e00a6b71d2b2ee909404c))
* **execute-driver-plugin:** update dependency webdriverio to v8.29.1 ([fb0f8f7](https://github.com/appium/appium/commit/fb0f8f776c6a03174f4569efa60d817a930809cf))
* **execute-driver-plugin:** update dependency webdriverio to v8.29.3 ([6dacb5e](https://github.com/appium/appium/commit/6dacb5e70ca3529a080f629f5245c2b676746e2c))
* **execute-driver-plugin:** update dependency webdriverio to v8.29.7 ([52a6f96](https://github.com/appium/appium/commit/52a6f96e085ff13acdf8d5013673861b7e0da818))
* **execute-driver-plugin:** update dependency webdriverio to v8.30.0 ([91320dd](https://github.com/appium/appium/commit/91320ddd02dca89a8cec258d0ab44a49d344d71c))
* **support:** update dependency axios to v1.6.4 ([332cc48](https://github.com/appium/appium/commit/332cc48a09b5532a8d51f85f3a24785e2c754e00))
* **support:** update dependency axios to v1.6.5 ([#19616](https://github.com/appium/appium/issues/19616)) ([ac73522](https://github.com/appium/appium/commit/ac73522351b31bd6c11972c61daa8b6b8d18fb91))
* **support:** update dependency axios to v1.6.6 ([6313704](https://github.com/appium/appium/commit/6313704ee5a8ee3aee726eb512ef259b6fa1041c))
* **support:** update dependency axios to v1.6.7 ([795092a](https://github.com/appium/appium/commit/795092a97f6d7569cccc4b5c166f52fef821514b))
* **types:** update dependency type-fest to v4.10 ([#19694](https://github.com/appium/appium/issues/19694)) ([966d305](https://github.com/appium/appium/commit/966d305e5eade9369a3875243bcad951df88545c))
* **types:** update dependency type-fest to v4.10.1 ([#19703](https://github.com/appium/appium/issues/19703)) ([501395c](https://github.com/appium/appium/commit/501395c9489320b84ab49ff78af4270f66070d62))



## [2.4.1](https://github.com/appium/appium/compare/appium@2.4.0...appium@2.4.1) (2024-01-04)


### Bug Fixes

* **appium:** Properly handle version check for aliases ([474f3ce](https://github.com/appium/appium/commit/474f3ce092c68981655d9deba546a6202acea141))



## [2.4.0](https://github.com/appium/appium/compare/appium@2.3.0...appium@2.4.0) (2024-01-03)


### Features

* add webdriver bidi support ([2b21e66](https://github.com/appium/appium/commit/2b21e66891e8ab8c3929f04f32e94eb4efdba691))
* **appium,support:** Add common shortcuts for doctor checks ([#19562](https://github.com/appium/appium/issues/19562)) ([893b9e1](https://github.com/appium/appium/commit/893b9e15d64d2356ea339596e805543df51fa505))
* **appium:** Make doctor extensible ([#19542](https://github.com/appium/appium/issues/19542)) ([a30286b](https://github.com/appium/appium/commit/a30286b6e7b9753f73e55a8f9db14211b3124578))
* **appium:** Print the list of available extension scripts if no script name is provided ([#19539](https://github.com/appium/appium/issues/19539)) ([dc2cedf](https://github.com/appium/appium/commit/dc2cedfecd19581321f6947ef1c847065ba2d3d6))
* Deny install/upgrade of packages which server dep does not meet the current Appium version ([#19575](https://github.com/appium/appium/issues/19575)) ([73bf68c](https://github.com/appium/appium/commit/73bf68cc602de0999e1956110be225c3fd9087c2))


### Bug Fixes

* **appium:** update dependency ws to v8.15.1 ([92d1172](https://github.com/appium/appium/commit/92d117298442e72ae262f224733068ddf147f4c8))
* **appium:** update dependency ws to v8.16.0 ([#19586](https://github.com/appium/appium/issues/19586)) ([fe5245a](https://github.com/appium/appium/commit/fe5245a42784181a9cd7a8ff6b095a622ae40920))
* **base-driver:** update dependency async-lock to v1.4.1 ([a304a1f](https://github.com/appium/appium/commit/a304a1f78e658f6f70cbe8e1efd6d06b81d8d34e))
* **docutils:** update dependency lilconfig to v3 ([#19489](https://github.com/appium/appium/issues/19489)) ([ea8394a](https://github.com/appium/appium/commit/ea8394a888c835bc54f7f68174a4b6cae85339ea))
* **execute-driver-plugin:** update dependency webdriverio to v8.26.3 ([ff767b7](https://github.com/appium/appium/commit/ff767b7f25e97ec9643f691b57ca6ba159dcdcf9))
* **execute-driver-plugin:** update dependency webdriverio to v8.27.0 ([9b06b87](https://github.com/appium/appium/commit/9b06b871eb3d9c60428130442ea7ab433ce4df31))
* **support:** update dependency axios to v1.6.3 ([441b284](https://github.com/appium/appium/commit/441b2848dae28472356f37fc5d51ac27af7bbe29))
* **types:** update dependency type-fest to v4 ([#19592](https://github.com/appium/appium/issues/19592)) ([94b3580](https://github.com/appium/appium/commit/94b358022fdba3050ef94c1f881895f07e24fb75))



## [2.3.0](https://github.com/appium/appium/compare/appium@2.2.3...appium@2.3.0) (2023-12-18)


### Features

* **appium:** Load drivers and plugins asynchronously ([#19512](https://github.com/appium/appium/issues/19512)) ([06e7f34](https://github.com/appium/appium/commit/06e7f3489dff820fa16b16e47417acd0c10e0b05))
* **docs:** enhance documentation ([#19528](https://github.com/appium/appium/issues/19528)) ([a7d70f3](https://github.com/appium/appium/commit/a7d70f388020ab7f942ec2b4b94c4a2a61b110b5))


### Bug Fixes

* **appium:** Respect the value of no-perms-check server arg ([#19518](https://github.com/appium/appium/issues/19518)) ([22ca747](https://github.com/appium/appium/commit/22ca74710718ddeda0526acd9dd3dd1703001e22))
* **appium:** update dependency @sidvind/better-ajv-errors to v2.1.2 ([9b07df9](https://github.com/appium/appium/commit/9b07df99592852cbf1096fc4bd94ffd4395c423d))
* **appium:** update dependency @sidvind/better-ajv-errors to v2.1.3 ([78d85f7](https://github.com/appium/appium/commit/78d85f77e8e1e0493a66afc6123f7bc6bc5c8d17))
* **appium:** Verify if script path is always under the module root ([#19543](https://github.com/appium/appium/issues/19543)) ([e25dd38](https://github.com/appium/appium/commit/e25dd38cd593d478c07012b4aa14fcd96788d294))
* **docutils:** remove `@appium/typedoc-plugin-appium` and all other uses of `typedoc` ([#19465](https://github.com/appium/appium/issues/19465)) ([7528fcf](https://github.com/appium/appium/commit/7528fcf890f79f4017f5e718bb1952bf907ee479))
* **docutils:** update dependency mike to v2.0.0 ([#19485](https://github.com/appium/appium/issues/19485)) ([0003304](https://github.com/appium/appium/commit/00033044e08f932b5daf1234cfb381c6f46c8bb8))
* **execute-driver-plugin:** update dependency webdriverio to v8.26.0 ([dfd1707](https://github.com/appium/appium/commit/dfd17074e94b2406caa87184ac73d992706e8e4d))
* **execute-driver-plugin:** update dependency webdriverio to v8.26.1 ([070cdfe](https://github.com/appium/appium/commit/070cdfe44f3dcd1c5530512b70191719a0047b8c))
* **execute-driver-plugin:** update dependency webdriverio to v8.26.2 ([#19537](https://github.com/appium/appium/issues/19537)) ([1f2c053](https://github.com/appium/appium/commit/1f2c053573f0df91449365dfe19dbd350f09ee89))
* **support:** update dependency teen_process to v2.0.109 ([85dce4a](https://github.com/appium/appium/commit/85dce4a72b21e017b4661ddf997c096817e5fd7f))
* **support:** update dependency teen_process to v2.0.110 ([b602693](https://github.com/appium/appium/commit/b60269371662de4c42ccd7586512c9d685d95d52))
* **support:** update dependency teen_process to v2.0.112 ([#19491](https://github.com/appium/appium/issues/19491)) ([d2d8ea7](https://github.com/appium/appium/commit/d2d8ea7a105eb93f59793fbc4d3438a66a191cd8))
* **support:** update dependency teen_process to v2.1.1 ([b79ed2b](https://github.com/appium/appium/commit/b79ed2bed5329b904b15fa5b1fbde7885087c9ad))
* **types:** update dependency type-fest to v4 ([#19104](https://github.com/appium/appium/issues/19104)) ([8bfa1b5](https://github.com/appium/appium/commit/8bfa1b5a4d090b0102dbb914c9b72aea52d96788))



## [2.2.3](https://github.com/appium/appium/compare/appium@2.2.2...appium@2.2.3) (2023-12-04)


### Bug Fixes

* **support:** update definitelytyped ([2c02be4](https://github.com/appium/appium/commit/2c02be440c21db0bf8a3832143e61ef8fb30a2cf))
* **support:** update dependency axios to v1.6.2 ([fda40e6](https://github.com/appium/appium/commit/fda40e60410e97d5ba5093442aad0b2d63d3d539))
* **support:** update dependency teen_process to v2.0.100 ([e50b53f](https://github.com/appium/appium/commit/e50b53fbea4aa3709adc3df4baf4945124d6a217))
* **support:** update dependency teen_process to v2.0.101 ([b837f8c](https://github.com/appium/appium/commit/b837f8ce14bd48edb6af62bca718a708d2b65f09))
* **support:** update dependency teen_process to v2.0.87 ([4df1712](https://github.com/appium/appium/commit/4df1712d9b0c3155e95e38a1aa552f036d37dcfe))
* **support:** update dependency teen_process to v2.0.89 ([c129111](https://github.com/appium/appium/commit/c1291116989159eb7e08d303354bc00262a9e784))
* **support:** update dependency teen_process to v2.0.91 ([6cedd48](https://github.com/appium/appium/commit/6cedd485d7007455151c6efc03dd6172d4a31259))
* **support:** update teen_process-related packages ([c637b05](https://github.com/appium/appium/commit/c637b052f45e0ae7ce68d29b9739718549302756))



## [2.2.2](https://github.com/appium/appium/compare/appium@2.2.1...appium@2.2.2) (2023-11-14)


### Bug Fixes

* **appium:** Load plugins in the same order that was used for the CLI command ([#19388](https://github.com/appium/appium/issues/19388)) ([7124eb6](https://github.com/appium/appium/commit/7124eb6075be0fabd83e9023a47b5a8f4c181a52))
* **docutils:** update dependency yaml to v2.3.4 ([a215a89](https://github.com/appium/appium/commit/a215a89f684c50da24d669d60a73fb6268b05c7f))
* **support:** update definitelytyped ([5ae8df3](https://github.com/appium/appium/commit/5ae8df3c36c7f03fbf3420087b532086f6742348))
* **support:** update dependency axios to v1.6.0 ([699c493](https://github.com/appium/appium/commit/699c49306c38e222d618a9611482b06a3e6806aa))
* **support:** update dependency axios to v1.6.1 ([9b14205](https://github.com/appium/appium/commit/9b14205288ef09fd4a1144fc93c82b2bb2ed2ec0))
* **support:** update dependency teen_process to v2.0.57 ([1fbd503](https://github.com/appium/appium/commit/1fbd503a66b965a9b32bbb6702062861a8480333))
* **support:** update dependency teen_process to v2.0.63 ([fa57192](https://github.com/appium/appium/commit/fa571925b7ac980cc99c8d23f659420eacd8546c))
* **support:** update dependency teen_process to v2.0.64 ([332bb59](https://github.com/appium/appium/commit/332bb59ee3fdd14c03f6b3c4fd6587a30319d568))
* **support:** update dependency teen_process to v2.0.66 ([3205b5d](https://github.com/appium/appium/commit/3205b5d06f073f1e5c7735c6e36ad08fdf091182))
* **support:** update dependency teen_process to v2.0.67 ([3b5ae2a](https://github.com/appium/appium/commit/3b5ae2ab17c74c9890b53c081aec146152f11c7a))
* **support:** update dependency teen_process to v2.0.73 ([8e453be](https://github.com/appium/appium/commit/8e453bed3f440c1dcf82f016f7d4431365b9cdff))
* **support:** update dependency teen_process to v2.0.75 ([fbb6fd9](https://github.com/appium/appium/commit/fbb6fd9a2780eb00c15584abeaf644a1fcdecb4d))
* **support:** update teen_process-related packages ([84d96db](https://github.com/appium/appium/commit/84d96dbae45dfe56218d32330f8ff2d26b750fb7))
* **support:** update teen_process-related packages ([3d0b97c](https://github.com/appium/appium/commit/3d0b97cae76c616da0aea5b92cebcd38d59263b7))



## [2.2.1](https://github.com/appium/appium/compare/appium@2.2.0...appium@2.2.1) (2023-10-19)


### Bug Fixes

* **appium:** Make sure type definitions are always in sync across modules ([#19323](https://github.com/appium/appium/issues/19323)) ([de39013](https://github.com/appium/appium/commit/de39013ae501d4fc11988435737efb862cc1d820))
* **support:** update definitelytyped ([a306ce7](https://github.com/appium/appium/commit/a306ce741a806d21bc44f3b979803b8af5da99aa))



## [2.2.0](https://github.com/appium/appium/compare/appium@2.1.3...appium@2.2.0) (2023-10-18)


### Features

* **base-driver:** Add server support of TLS and SPDY protocols ([#19105](https://github.com/appium/appium/issues/19105)) ([5926919](https://github.com/appium/appium/commit/5926919177e3df675723c80d800f933fdbda5824))


### Bug Fixes

* **appium:** Fix creation of logging prefixes ([#19212](https://github.com/appium/appium/issues/19212)) ([805f69d](https://github.com/appium/appium/commit/805f69de354ebf0b1e8ffeb64c85833b5d533b4c))
* **appium:** update dependency winston to v3.11.0 ([f697cda](https://github.com/appium/appium/commit/f697cda9af2b61344b55b5af0f2bfc1fd034334b))
* **docutils:** update dependency yaml to v2.3.2 ([1a3d408](https://github.com/appium/appium/commit/1a3d408e239e4a9a7070923a90aca70df1dda908))
* **docutils:** update dependency yaml to v2.3.3 ([caf600b](https://github.com/appium/appium/commit/caf600bffd5f25971d0270e9990b2640a671e366))
* **images-plugin:** update dependency lru-cache to v10 ([#19050](https://github.com/appium/appium/issues/19050)) ([72a806b](https://github.com/appium/appium/commit/72a806bec7c3a80747192d24dfd9d8286a751810))
* **opencv:** update definitelytyped ([d2a9a99](https://github.com/appium/appium/commit/d2a9a99418af9ce9b569bb9b98ee396faab932bb))
* **support:** update definitelytyped ([3b44c7d](https://github.com/appium/appium/commit/3b44c7d8f5b89f9357dfe6bb56b54799bbe0a921))
* **support:** update definitelytyped ([595d460](https://github.com/appium/appium/commit/595d460ac8dc41d310f9e4f653acbad3c7fd50b9))
* **support:** update definitelytyped ([b6a76ce](https://github.com/appium/appium/commit/b6a76ce91e2765c22f84e389b93f780e0b4490c0))
* **support:** update definitelytyped ([3e73600](https://github.com/appium/appium/commit/3e7360021dba0f8e8967094476fe92646ba5e35b))
* **support:** update dependency @types/semver to v7.5.1 ([a0f59d0](https://github.com/appium/appium/commit/a0f59d05945e627602407d1d42e7a3a58861b11f))
* **support:** update dependency @types/teen_process to v2.0.1 ([d2f19aa](https://github.com/appium/appium/commit/d2f19aab935cc6ec00a51f042b5f02674a772198))
* **support:** update dependency axios to v1.5.0 ([08913cd](https://github.com/appium/appium/commit/08913cddde295f616f0fb376cc2cb71a9409a253))
* **support:** update dependency axios to v1.5.1 ([#19217](https://github.com/appium/appium/issues/19217)) ([3df047d](https://github.com/appium/appium/commit/3df047d128d5d032826c8f5fb605b019078b717d))
* **support:** update dependency teen_process to v2.0.10 ([bc1b56a](https://github.com/appium/appium/commit/bc1b56a3c162ed8686d3d7956c30eb1f7682b1a7))
* **support:** update dependency teen_process to v2.0.12 ([c5d6df7](https://github.com/appium/appium/commit/c5d6df7a000d64e8591a56ce5ef65baa2071a36b))
* **support:** update dependency teen_process to v2.0.13 ([a0c4b84](https://github.com/appium/appium/commit/a0c4b84fb7d3977b7a4ca0a07fadd49ee355791a))
* **support:** update dependency teen_process to v2.0.18 ([ffeebc7](https://github.com/appium/appium/commit/ffeebc74b72e5eadf658325e67708ae6ed5b8346))
* **support:** update dependency teen_process to v2.0.19 ([2ef40fe](https://github.com/appium/appium/commit/2ef40febdc717f54ea618ecfe1058b858fe2daf9))
* **support:** update dependency teen_process to v2.0.23 ([1b0459e](https://github.com/appium/appium/commit/1b0459edd656514d8706aab8e21cd4d40de2ec5d))
* **support:** update dependency teen_process to v2.0.24 ([bc72c66](https://github.com/appium/appium/commit/bc72c6676a5412b60e74bb143a223738ce059977))
* **support:** update dependency teen_process to v2.0.27 ([03b2aa6](https://github.com/appium/appium/commit/03b2aa6b6e45fa0ea24c4691b039255bc4399733))
* **support:** update dependency teen_process to v2.0.30 ([7cdb142](https://github.com/appium/appium/commit/7cdb1429a1104ad3699547f2a2dd9b237135891a))
* **support:** update dependency teen_process to v2.0.34 ([#19218](https://github.com/appium/appium/issues/19218)) ([c28fcef](https://github.com/appium/appium/commit/c28fcefa725fbce5a0464e57946051e3cb023d85))
* **support:** update dependency teen_process to v2.0.37 ([6d894be](https://github.com/appium/appium/commit/6d894bef6f377ebfdffdeb1adde7a72624844414))
* **support:** update dependency teen_process to v2.0.38 ([a32dc11](https://github.com/appium/appium/commit/a32dc1110125d0f1fac9c66c17f1309145a634c7))
* **support:** update dependency teen_process to v2.0.40 ([2837bcd](https://github.com/appium/appium/commit/2837bcdeb19532fe973a2902db5c8d730252d962))
* **support:** update dependency teen_process to v2.0.41 ([1a34396](https://github.com/appium/appium/commit/1a34396339f71d40353d323feaf78afcf2269fc9))
* **support:** update dependency teen_process to v2.0.42 ([e2a670e](https://github.com/appium/appium/commit/e2a670e1c4a0f061b0bfb08a6b534d9deb7bdd9c))
* **support:** update dependency teen_process to v2.0.45 ([ea731bf](https://github.com/appium/appium/commit/ea731bf117d680496fce453ac42cfee7f05ada60))
* **support:** update dependency teen_process to v2.0.48 ([eebc651](https://github.com/appium/appium/commit/eebc651f31c282baa7e77a6384d3ee8efc0072d6))
* **support:** update dependency teen_process to v2.0.50 ([ca3e5d9](https://github.com/appium/appium/commit/ca3e5d90e4c51fc1dda32154e1d77e65cb44fb54))
* **support:** update dependency teen_process to v2.0.9 ([6c7f3ef](https://github.com/appium/appium/commit/6c7f3ef670d441bdc4b693948a19dcbdc54e4764))



## [2.1.3](https://github.com/appium/appium/compare/appium@2.1.2...appium@2.1.3) (2023-08-23)

**Note:** Version bump only for package appium





## [2.1.2](https://github.com/appium/appium/compare/appium@2.1.1...appium@2.1.2) (2023-08-22)

**Note:** Version bump only for package appium





## [2.1.1](https://github.com/appium/appium/compare/appium@2.1.0...appium@2.1.1) (2023-08-21)

**Note:** Version bump only for package appium





## [2.1.0](https://github.com/appium/appium/compare/appium@2.0.1...appium@2.1.0) (2023-08-17)


### Features

* **base-driver:** Make it possible to provide settings as a map in session capabilities ([#18970](https://github.com/appium/appium/issues/18970)) ([aaf58c3](https://github.com/appium/appium/commit/aaf58c3de66fee2eb10225d05e156e7416a4ac79))


### Bug Fixes

* **appium:** Fix the plural form ([97d8f0d](https://github.com/appium/appium/commit/97d8f0df44d915b346a6ecd0d052369dd80a9569))
* **appium:** update dependency winston to v3.10.0 ([b85a92a](https://github.com/appium/appium/commit/b85a92a912b3d2854e8102b41119fc780e1a6cc2))
* **appium:** Update the GET /status response to be in sync with the standard ([#18972](https://github.com/appium/appium/issues/18972)) ([5a26111](https://github.com/appium/appium/commit/5a2611137b2a7428bb2e593fc945e21874c4cdae))
* **support:** update dependency glob to v10 ([#18490](https://github.com/appium/appium/issues/18490)) ([aaf31a5](https://github.com/appium/appium/commit/aaf31a577cb0b9cbe22646dcd888dc393a03aa11))
* **support:** update dependency semver to v7.5.4 ([03ddcdf](https://github.com/appium/appium/commit/03ddcdfcafbccf6698868a272e499cbdac41d791))
* **types:** update dependency type-fest to v3.13.1 ([fb34ab9](https://github.com/appium/appium/commit/fb34ab917216121d2b554677a12f07a03393d218))



## [2.0.1](https://github.com/appium/appium/compare/appium@2.0.0...appium@2.0.1) (2023-07-24)


### Bug Fixes

* **appium:** ensure plugin commands reset newCommandTimeout ([41836a4](https://github.com/appium/appium/commit/41836a4a7bfb0d7602839c081a4e3c4792e869df))
* **support:** update dependency teen_process to v2.0.4 ([151c19c](https://github.com/appium/appium/commit/151c19c1c3b4c9b94aba10033c2d863f567d849b))



## [2.0.0-rc.5](https://github.com/appium/appium/compare/appium@2.0.0-rc.4...appium@2.0.0-rc.5) (2023-07-03)


### Bug Fixes

* **appium:** restrict address to ipv6/hostname ([#18824](https://github.com/appium/appium/issues/18824)) ([f09fbb6](https://github.com/appium/appium/commit/f09fbb64dce0e179a007f3a0ae9800e61fbe90eb)), closes [#18716](https://github.com/appium/appium/issues/18716)
* **appium:** type fixes for ts v5 ([c13333b](https://github.com/appium/appium/commit/c13333bb979ee3409e6a62a5800c629781553b42))
* **support:** update dependency semver to v7.5.3 ([ed1856d](https://github.com/appium/appium/commit/ed1856d720c442842d5c3fe5f6caeccb8229b5f1))



## [2.0.0-rc.4](https://github.com/appium/appium/compare/appium@2.0.0-rc.3...appium@2.0.0-rc.4) (2023-06-29)

**Note:** Version bump only for package appium





## [2.0.0-rc.3](https://github.com/appium/appium/compare/appium@2.0.0-rc.2...appium@2.0.0-rc.3) (2023-06-15)

**Note:** Version bump only for package appium





## [2.0.0-rc.2](https://github.com/appium/appium/compare/appium@2.0.0-rc.1...appium@2.0.0-rc.2) (2023-06-14)

**Note:** Version bump only for package appium





## [2.0.0-rc.1](https://github.com/appium/appium/compare/appium@2.0.0-beta.71...appium@2.0.0-rc.1) (2023-06-14)


### Features

* **appium:** Allow to provide ipv6 addresses and handle broadcast addresses in logs ([#18674](https://github.com/appium/appium/issues/18674)) ([8f63dab](https://github.com/appium/appium/commit/8f63dabb5dca882e522026f243e3445f5418874b))


### Bug Fixes

* **appium:** update dependency winston to v3.9.0 ([a98d9c3](https://github.com/appium/appium/commit/a98d9c33c761af6870411721cc0d6c4491b43940))
* **docutils:** update dependency yaml to v2.3.0 ([325d237](https://github.com/appium/appium/commit/325d2372078ee01e8fb58613ffd13417f2527151))
* **docutils:** update dependency yaml to v2.3.1 ([1a2260b](https://github.com/appium/appium/commit/1a2260bb15d75e4f4c23551dc61529108a7b0d88))
* ensure logServerAddress gets an actual URL ([#18754](https://github.com/appium/appium/issues/18754)) ([901ac71](https://github.com/appium/appium/commit/901ac711c4e2207f30d93ad177a332b7d6f23c38))
* **support:** update dependency @types/semver to v7.5.0 ([528dcfe](https://github.com/appium/appium/commit/528dcfe324e75e48471cdb694448c2a09ec2d828))
* **support:** update dependency semver to v7.5.1 ([5a55509](https://github.com/appium/appium/commit/5a555090c5322318f845415d743ee5c645fb94a0))
* **types:** fix broken appium config schema types, temporarily ([fd2c72f](https://github.com/appium/appium/commit/fd2c72fd886ecaaf0f6588a328ff8a268a54fb55))
* **types:** update dependency type-fest to v3.11.0 ([19277f6](https://github.com/appium/appium/commit/19277f6e14a56e52b4669d633e148ad4a3da2c7a))
* **types:** update dependency type-fest to v3.11.1 ([56499eb](https://github.com/appium/appium/commit/56499eb997b551739bed628f057de7987674ea7f))



## [2.0.0-beta.71](https://github.com/appium/appium/compare/appium@2.0.0-beta.70...appium@2.0.0-beta.71) (2023-05-19)

**Note:** Version bump only for package appium





## [2.0.0-beta.70](https://github.com/appium/appium/compare/appium@2.0.0-beta.69...appium@2.0.0-beta.70) (2023-05-19)

**Note:** Version bump only for package appium





## [2.0.0-beta.69](https://github.com/appium/appium/compare/appium@2.0.0-beta.68...appium@2.0.0-beta.69) (2023-05-19)

**Note:** Version bump only for package appium





## [2.0.0-beta.68](https://github.com/appium/appium/compare/appium@2.0.0-beta.67...appium@2.0.0-beta.68) (2023-05-19)

**Note:** Version bump only for package appium





## [2.0.0-beta.67](https://github.com/appium/appium/compare/appium@2.0.0-beta.66...appium@2.0.0-beta.67) (2023-05-17)


### Bug Fixes

* **docutils:** update dependency yaml to v2.2.2 ([ddadd69](https://github.com/appium/appium/commit/ddadd6977d76a8a5ce1559d2a4ff4a31b58fb42f))
* **execute-driver-plugin:** update dependency webdriverio to v7.31.1 ([6499eea](https://github.com/appium/appium/commit/6499eea0af6aea1bfb69b1e36c4c445e3ab05b82))
* **support:** update dependency axios to v1.3.6 ([6692227](https://github.com/appium/appium/commit/66922279b7742a08613f472585a4a1cb70f80683))
* **support:** update dependency axios to v1.4.0 ([91a6bc5](https://github.com/appium/appium/commit/91a6bc5925ab8ffc4ab6d05883900f7d186e49a9))
* **support:** update dependency semver to v7.5.0 ([c568523](https://github.com/appium/appium/commit/c568523e017a8b52bdf5132a48bbfde791de704f))
* **types:** update dependency type-fest to v3.10.0 ([3c4d3ac](https://github.com/appium/appium/commit/3c4d3acc09d2ca1ed74dc77c18c62482e4c70239))
* **types:** update dependency type-fest to v3.9.0 ([94a207f](https://github.com/appium/appium/commit/94a207fc9718068f3657c51cc8be0ef682f16b11))



## [2.0.0-beta.66](https://github.com/appium/appium/compare/appium@2.0.0-beta.65...appium@2.0.0-beta.66) (2023-04-20)

**Note:** Version bump only for package appium





## [2.0.0-beta.65](https://github.com/appium/appium/compare/appium@2.0.0-beta.64...appium@2.0.0-beta.65) (2023-04-18)

**Note:** Version bump only for package appium





## [2.0.0-beta.64](https://github.com/appium/appium/compare/appium@2.0.0-beta.63...appium@2.0.0-beta.64) (2023-04-14)


### Bug Fixes

* **support:** update dependency semver to v7.4.0 ([6ae86bd](https://github.com/appium/appium/commit/6ae86bd5c7be879a4d8852951d73eb2f68128df3))



## [2.0.0-beta.63](https://github.com/appium/appium/compare/appium@2.0.0-beta.62...appium@2.0.0-beta.63) (2023-04-12)

**Note:** Version bump only for package appium





# [2.0.0-beta.62](https://github.com/appium/appium/compare/appium@2.0.0-beta.61...appium@2.0.0-beta.62) (2023-04-10)


### Bug Fixes

* **support:** update dependency axios to v1.3.5 ([6cf1480](https://github.com/appium/appium/commit/6cf14802b70a462beffc12a1134476596060c005))
* **types:** update dependency type-fest to v3.8.0 ([d6c42e9](https://github.com/appium/appium/commit/d6c42e99c08efce0b34796d5982ce379fca044d3))


### Features

* **appium:** make "ls" alias of "list" ([5ab2fea](https://github.com/appium/appium/commit/5ab2fea5768ef8c67270d49c920b9515ca1ff1e4))





# [2.0.0-beta.61](https://github.com/appium/appium/compare/appium@2.0.0-beta.60...appium@2.0.0-beta.61) (2023-04-05)

**Note:** Version bump only for package appium





# [2.0.0-beta.60](https://github.com/appium/appium/compare/appium@2.0.0-beta.59...appium@2.0.0-beta.60) (2023-04-04)

**Note:** Version bump only for package appium





# [2.0.0-beta.59](https://github.com/appium/appium/compare/appium@2.0.0-beta.58...appium@2.0.0-beta.59) (2023-04-03)


### Bug Fixes

* **appium:** update dependency package-changed to v3 ([bbcaec9](https://github.com/appium/appium/commit/bbcaec9c05e93d522ae72e30368cecc876e16db7))
* **types:** update dependency type-fest to v3.7.2 ([5580539](https://github.com/appium/appium/commit/55805390b5a0c6aa718bb357b30f66651f3db281))





# [2.0.0-beta.58](https://github.com/appium/appium/compare/appium@2.0.0-beta.57...appium@2.0.0-beta.58) (2023-03-28)


### Bug Fixes

* **appium,types,base-driver,fake-driver,driver-test-support:** normalize constraint defaults ([3c9fa7b](https://github.com/appium/appium/commit/3c9fa7ba73b639e610e1f3d41d239a9402845b4c))
* **appium:** remove longjohn ([0c52b50](https://github.com/appium/appium/commit/0c52b50e6595a16287d0bb71960fb2e08278de6f)), closes [#18357](https://github.com/appium/appium/issues/18357)
* backwards-compatible fixes for TS v5.x ([4974403](https://github.com/appium/appium/commit/49744036619ecc239e0e6255a13d38cafd709920))
* **types:** update dependency type-fest to v3.7.0 ([6912fa1](https://github.com/appium/appium/commit/6912fa14f2a7d338f17e1bed060e959de7aba1d6))
* **types:** update dependency type-fest to v3.7.1 ([bc860c7](https://github.com/appium/appium/commit/bc860c733a73760f0c42cbfb384e04d50c376d5e))


### Features

* **appium:** improvements to ext commands when running extension in development ([d9b47bc](https://github.com/appium/appium/commit/d9b47bc86434c50382221397cf39c10e661c1ea9)), closes [#18277](https://github.com/appium/appium/issues/18277)





# [2.0.0-beta.57](https://github.com/appium/appium/compare/appium@2.0.0-beta.56...appium@2.0.0-beta.57) (2023-03-08)


### Bug Fixes

* **appium,fake-driver:** expose child process when running an extension script ([e9dae3f](https://github.com/appium/appium/commit/e9dae3f6d006dcf89b6c0b6fb491be15acfed98b))
* **appium,support:** fs.readPackageJsonFrom() returns proper type ([9ccbab5](https://github.com/appium/appium/commit/9ccbab5dc02d0019b0cad903772cda872d9fd5fb))
* **docutils:** update dependency lilconfig to v2.1.0 ([4ed745a](https://github.com/appium/appium/commit/4ed745a95ffc6a43f76003eba62019c16a4c6cf2))
* **execute-driver-plugin:** update dependency webdriverio to v7.30.2 ([49694f5](https://github.com/appium/appium/commit/49694f50a4680138cc92aba1eee294c927d712cf))
* **types:** update dependency type-fest to v3.6.1 ([471a4b5](https://github.com/appium/appium/commit/471a4b57e622ff077d59f577a78341268700c48d))





# [2.0.0-beta.56](https://github.com/appium/appium/compare/appium@2.0.0-beta.55...appium@2.0.0-beta.56) (2023-02-24)


### Bug Fixes

* appium:options should work via --default-capabilities ([11e7ad0](https://github.com/appium/appium/commit/11e7ad0cd403ab1dc100f581cdf93772e3449db3)), closes [#18191](https://github.com/appium/appium/issues/18191)
* **execute-driver-plugin:** update dependency webdriverio to v7.30.1 ([547b8a4](https://github.com/appium/appium/commit/547b8a45c4b5629720b0f4bdb0485a861aecbebf))
* **support:** update dependency axios to v1.3.4 ([49f157d](https://github.com/appium/appium/commit/49f157d63e3bdbd205527a5dc8f997df68540546))
* **types:** update dependency type-fest to v3.5.7 ([b4416c5](https://github.com/appium/appium/commit/b4416c5c0f40200b36909a1fbb492d8c4a212108))
* **types:** update dependency type-fest to v3.6.0 ([08a6f3a](https://github.com/appium/appium/commit/08a6f3a308c7ee162e992629888557b31e50a26e))
* update axios to v1.3.3 ([8f9de63](https://github.com/appium/appium/commit/8f9de63e4a622712db545ab63f9f4ce6654e4a91))





# [2.0.0-beta.55](https://github.com/appium/appium/compare/appium@2.0.0-beta.54...appium@2.0.0-beta.55) (2023-02-09)


### Bug Fixes

* **docutils:** fix bad option name and ignore most falsy args ([5446e5c](https://github.com/appium/appium/commit/5446e5c7a755be081f46f1ed1ca8c13665d9a772))





# [2.0.0-beta.54](https://github.com/appium/appium/compare/appium@2.0.0-beta.53...appium@2.0.0-beta.54) (2023-02-09)


### Bug Fixes

* add missing ' in an error message ([#18105](https://github.com/appium/appium/issues/18105)) ([0f95213](https://github.com/appium/appium/commit/0f952133987a5da176442eff22d5981ed8959fbe))
* **appium:** fix broken autoinstall script ([2b3e576](https://github.com/appium/appium/commit/2b3e576393e2dd6a33172632f1e009853e83a8e2))
* **appium:** update dependency package-changed to v2 ([0d7390f](https://github.com/appium/appium/commit/0d7390faa4df51f67eed74d8539c34a8a67f7ed0))
* **execute-driver-plugin:** update dependency webdriverio to v7.30.0 ([444b988](https://github.com/appium/appium/commit/444b9886a2ef76f16a477ed2e1f6d3eadd542da3))
* **support:** update dependency axios to v1.2.3 ([20c176b](https://github.com/appium/appium/commit/20c176bae7d0a4f928082fe1a9237f995b8bd58e))
* **typedoc-plugin-appium:** use simple filenames for ExtensionReflection objects ([6c26b97](https://github.com/appium/appium/commit/6c26b971246de09ce07b85a34122273f4fad3125)), closes [#18110](https://github.com/appium/appium/issues/18110)
* **types:** update dependency type-fest to v3.5.4 ([cfb5297](https://github.com/appium/appium/commit/cfb529772cff3a2b7e9ff36e12444b603906a769))
* **types:** update dependency type-fest to v3.5.5 ([9bf320c](https://github.com/appium/appium/commit/9bf320c87ccf574f933a8247a851b4f848c39fa1))
* **types:** update dependency type-fest to v3.5.6 ([775c990](https://github.com/appium/appium/commit/775c990f9d4176e78936a071968a788e19048519))





# [2.0.0-beta.53](https://github.com/appium/appium/compare/appium@2.0.0-beta.52...appium@2.0.0-beta.53) (2023-01-23)


### Bug Fixes

* **docs:** fix filename of basedriver commands ([18772f4](https://github.com/appium/appium/commit/18772f4f0d04d4c27135b6a66732bd9518568bdf))
* **support:** update dependency glob to v8.1.0 ([d7b35ab](https://github.com/appium/appium/commit/d7b35ab28b8afd0f93f775a223373956a57ee881))
* **types:** update dependency type-fest to v3.5.2 ([64fd8ce](https://github.com/appium/appium/commit/64fd8ce94018b0bb7ccb2baade8d525703f41c45))
* **types:** update dependency type-fest to v3.5.3 ([6c4ba8c](https://github.com/appium/appium/commit/6c4ba8caa508840640f05eea1ab41ecb290312aa))





# [2.0.0-beta.52](https://github.com/appium/appium/compare/appium@2.0.0-beta.51...appium@2.0.0-beta.52) (2023-01-13)

**Note:** Version bump only for package appium





# [2.0.0-beta.51](https://github.com/appium/appium/compare/appium@2.0.0-beta.50...appium@2.0.0-beta.51) (2023-01-13)

**Note:** Version bump only for package appium





# [2.0.0-beta.50](https://github.com/appium/appium/compare/appium@2.0.0-beta.49...appium@2.0.0-beta.50) (2023-01-13)

**Note:** Version bump only for package appium





# [2.0.0-beta.49](https://github.com/appium/appium/compare/appium@2.0.0-beta.48...appium@2.0.0-beta.49) (2023-01-13)


### Bug Fixes

* **appium:** inability to find automationName inside appium:options ([#17966](https://github.com/appium/appium/issues/17966)) ([23224cf](https://github.com/appium/appium/commit/23224cf002b7dd9e4e5d8426b4bbe1cb28f62605))
* **appium:** update dependency ajv to v8.12.0 ([783989b](https://github.com/appium/appium/commit/783989b56c80ebc0eebf693c168754130627b55f))
* **appium:** update dependency yaml to v2.2.0 ([28c6204](https://github.com/appium/appium/commit/28c6204b751ead304cce21d534c91381fa39d79d))
* **appium:** update dependency yaml to v2.2.1 ([b763880](https://github.com/appium/appium/commit/b763880779abaea900ac2c129dfb009b0e8ed0a9))
* **execute-driver-plugin:** update dependency webdriverio to v7.28.1 ([2bb4f32](https://github.com/appium/appium/commit/2bb4f32329938e15062e42b585dd760cca5ae17b))
* **execute-driver-plugin:** update dependency webdriverio to v7.29.0 ([a3fad3e](https://github.com/appium/appium/commit/a3fad3ed28822b1dfaae72cbfb8d7906ec35e158))
* **execute-driver-plugin:** update dependency webdriverio to v7.29.1 ([7c59380](https://github.com/appium/appium/commit/7c59380e6b97691ff16a8d98a912d67b7972593a))
* **support:** update dependency axios to v1.2.2 ([5291ca6](https://github.com/appium/appium/commit/5291ca672b3b47c5270e9fd85de3e4ed76a650e0))
* **types:** update dependency type-fest to v3.5.0 ([8c8bfe8](https://github.com/appium/appium/commit/8c8bfe824dbe062e24cfe9fc6e1afa2f68cc6e4c))
* **types:** update dependency type-fest to v3.5.1 ([4b5ab4d](https://github.com/appium/appium/commit/4b5ab4da7be925d0592c18e8f46a9ce30fbddf8e))


### Features

* **base-driver:** deprecate non-standard routes ([7055a0b](https://github.com/appium/appium/commit/7055a0b28193f677b21541ddada3c4a314f90f5b))
* **typedoc-appium-plugin:** implement cross-referencing of methods ([8b33414](https://github.com/appium/appium/commit/8b334149018f7d49448da9e7982356c72bcd468e))





# [2.0.0-beta.48](https://github.com/appium/appium/compare/appium@2.0.0-beta.47...appium@2.0.0-beta.48) (2022-12-21)

### Bug Fixes

- **appium:** ensure migration always gets applied ([20667be](https://github.com/appium/appium/commit/20667be9a21e71963ecb7e25e1b8d51864bce011))
- **appium:** fix manifest migrations ([df250cc](https://github.com/appium/appium/commit/df250cc1e024f4971abe7e756594f7feee32cba6))
- **execute-driver-plugin:** update dependency webdriverio to v7.28.0 ([f81e2e9](https://github.com/appium/appium/commit/f81e2e92eff25c33d36f767209f423227d288218))
- **types:** update dependency type-fest to v3.4.0 ([37f71c3](https://github.com/appium/appium/commit/37f71c327a7c1a6d882b5198af6fedc9e8d51496))

### Features

- **appium:** add chromium driver to list of officially supported drivers ([#17939](https://github.com/appium/appium/issues/17939)) ([fe67e4c](https://github.com/appium/appium/commit/fe67e4cb2fca977dd9994f1cfbba4a0edc61ef83))

# [2.0.0-beta.47](https://github.com/appium/appium/compare/appium@2.0.0-beta.46...appium@2.0.0-beta.47) (2022-12-14)

### Bug Fixes

- **appium:** --show-config shouid only show CLI args if any were used ([3de553a](https://github.com/appium/appium/commit/3de553ad3a58313c14c12880d099d59ba03cd559))
- **appium,support:** re-enable log-filters ([b3b6427](https://github.com/appium/appium/commit/b3b642778aae6138f246c4fa9ecb32b017c25f7a))
- **appium,types:** cliArgs is never undefined ([e66dbb5](https://github.com/appium/appium/commit/e66dbb55cb43ecb4d01e8b9bf1cb8476a9e21639))
- **appium:** do not pollute pre-config parsed args with config file & defaults ([5dcd2e2](https://github.com/appium/appium/commit/5dcd2e2d303b905fe96e8566fbf6fa80d8687595))
- **appium:** ensure appiumCliDest is recognized by config file normalizer ([1f89d7c](https://github.com/appium/appium/commit/1f89d7c2ffcad823bb0dbac54cb747ac24aa40ef)), closes [#17638](https://github.com/appium/appium/issues/17638)
- **appium:** fix problematic ExtManifestWithSchema type ([6d514c5](https://github.com/appium/appium/commit/6d514c54b365197eacc37d01324a78eb508002c5))
- **appium:** fixup ([6c61eb8](https://github.com/appium/appium/commit/6c61eb8f4ed0f19edc0fa4affe9e374e6b4e426a))
- **appium:** squelch deprecation warning out of argparser ([f4d1b81](https://github.com/appium/appium/commit/f4d1b817a10302b407a84fe644c968bf17ba89a1))
- **appium:** store path to installed extension ([10d1438](https://github.com/appium/appium/commit/10d1438af7e5bc2b523cf775c65199abe000e747))
- **appium:** update dependency ajv to v8.11.2 ([5a794ce](https://github.com/appium/appium/commit/5a794ce1b61e433e568964551c805aa9c82af3ca))
- **execute-driver-plugin:** update dependency webdriverio to v7.27.0 ([edb3251](https://github.com/appium/appium/commit/edb325131b809edae3e73db8d43322dda915b201))
- **fake-driver:** update dependency asyncbox to v2.9.4 ([70a9c14](https://github.com/appium/appium/commit/70a9c144fc0bd80c4459223d5c8170a4d541db6c))
- **opencv:** update definitelytyped ([32557f4](https://github.com/appium/appium/commit/32557f4bca5acc2f89cfd3a70f369cebeb94c588))
- **schema:** add definition for log filters ([09c5901](https://github.com/appium/appium/commit/09c59017193b0fd839e41e44400872ab592d177a))
- **support:** Make upgradable versions parsing more permissive ([#17666](https://github.com/appium/appium/issues/17666)) ([32a2616](https://github.com/appium/appium/commit/32a2616c3600e0ba91a29981d9af27fb4fede833))
- **support:** update dependency axios to v1.2.0 ([b80b88b](https://github.com/appium/appium/commit/b80b88bd9cf2d6325ea6104449170b8339bf23e0))
- **support:** update dependency axios to v1.2.1 ([07d6ef6](https://github.com/appium/appium/commit/07d6ef6b8cc1608da8860f601a80ec0f6a7a7598))
- **support:** update dependency npmlog to v7 ([68778ca](https://github.com/appium/appium/commit/68778ca5c5f92ae973fb7055d84030630b31e1e9))
- **types:** update dependency type-fest to v3.2.0 ([f5da9f3](https://github.com/appium/appium/commit/f5da9f31a31b62d32b076857891cb027887fdbaf))
- **types:** update dependency type-fest to v3.3.0 ([33aef07](https://github.com/appium/appium/commit/33aef07d245627e67823a3b344cdf612e4452551))
- **types:** update webdriverio monorepo to v7.26.0 ([2a445ad](https://github.com/appium/appium/commit/2a445addffb5c972c7dcac50a1bf25601efa003d))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- **appium,support:** use npm link for local installs ([b5be1fe](https://github.com/appium/appium/commit/b5be1fe93bc73953d7da17938d41f1db1b76143d))
- **appium:** Add colorized console logs to Appium (2.x) ([#17481](https://github.com/appium/appium/issues/17481)) ([fe4c6d6](https://github.com/appium/appium/commit/fe4c6d68a078cefa6bcdc9258e3f25b311bfe521))
- **appium:** add easy access to a few more drivers and plugins ([#17878](https://github.com/appium/appium/issues/17878)) ([5d60c45](https://github.com/appium/appium/commit/5d60c45cce83f664d0cbac256936d5ed0e43aec6))
- **appium:** implement schema migrations ([13df5c7](https://github.com/appium/appium/commit/13df5c74e0ef1acae46d2ef821ed01d9118eab05))
- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))
- **schema:** allow root $schema prop ([726a7e1](https://github.com/appium/appium/commit/726a7e10deadcc8150a549fb853fbf5cca033248))
- **types:** add declarations for versioned manifest files and their types ([2092360](https://github.com/appium/appium/commit/209236023d5f23e2ccb94be6959babd8702a65bc))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

# [2.0.0-beta.46](https://github.com/appium/appium/compare/appium@2.0.0-beta.45...appium@2.0.0-beta.46) (2022-10-14)

**Note:** Version bump only for package appium

# [2.0.0-beta.45](https://github.com/appium/appium/compare/appium@2.0.0-beta.44...appium@2.0.0-beta.45) (2022-10-13)

### Features

- **appium,support:** enable detection of local extensions for improved DX ([b186928](https://github.com/appium/appium/commit/b186928e60493e7603dc3b27725dad8ee20d3750))

# [2.0.0-beta.44](https://github.com/appium/appium/compare/appium@2.0.0-beta.43...appium@2.0.0-beta.44) (2022-09-07)

### Bug Fixes

- **appium:** do not throw ENAMETOOLONG on long cli arg ([cfdf898](https://github.com/appium/appium/commit/cfdf898e04e94032e3dd48b595caa4b6f0828289))
- **appium:** eat update info errors ([7d7bb7a](https://github.com/appium/appium/commit/7d7bb7abc3173d29b843b3b238465d9914eaf091)), closes [#17357](https://github.com/appium/appium/issues/17357)

### chore

- **appium:** remove test export ([6820f5e](https://github.com/appium/appium/commit/6820f5ec4e62fbb5e91ce739d8aadb7f7b7a7a74)), closes [#17398](https://github.com/appium/appium/issues/17398)

### Features

- **appium:** Adjust NODE_PATH so NPM could properly resolve component peer dependencies ([#17325](https://github.com/appium/appium/issues/17325)) ([39d5cee](https://github.com/appium/appium/commit/39d5cee1b71f611e810900d3faed8e0fed6e1ce0))
- **support:** Move module root detection utility into support package ([#17427](https://github.com/appium/appium/issues/17427)) ([5ab7829](https://github.com/appium/appium/commit/5ab78297e172bc6a5751c636f81b3b202fbe2743))

### BREAKING CHANGES

- **appium:** This removes the `test` export from `appium`. `import * from 'appium/test'` is no longer supported.

Use `@appium/test-support`, `@appium/driver-test-support` or `@appium/plugin-test-support` instead.

# [2.0.0-beta.43](https://github.com/appium/appium/compare/appium@2.0.0-beta.42...appium@2.0.0-beta.43) (2022-08-10)

### Bug Fixes

- **appium:** fix busted config file normalization algorithm ([dc4835f](https://github.com/appium/appium/commit/dc4835f293f371c36873801a0060bb22eead2cc0))

### Features

- **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)
- **base-driver,fake-driver,appium:** add convenience methods for defining execute script overloads ([#17321](https://github.com/appium/appium/issues/17321)) ([337ec3e](https://github.com/appium/appium/commit/337ec3e7ba216dd6f8cdc88143ecaa4c75f5d266))

# [2.0.0-beta.42](https://github.com/appium/appium/compare/appium@2.0.0-beta.41...appium@2.0.0-beta.42) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))
- **appium:** add npm version check ([27ac2fa](https://github.com/appium/appium/commit/27ac2fa125bbfbe2e2ad5a3e7bf31d518510aa2d))
- **appium:** partially revert 2a6a056187ce925d5776b7acc4954b10ecf9221b ([b7e905e](https://github.com/appium/appium/commit/b7e905eaf188f0f23f279620d8ce7dfba60f0b25))

### Features

- **appium:** pass unknown args to extension scripts ([faff3ce](https://github.com/appium/appium/commit/faff3ce3471abaea24d2cb4c3e3b75b1af5ac3a1)), closes [#17250](https://github.com/appium/appium/issues/17250)

# [2.0.0-beta.41](https://github.com/appium/appium/compare/appium@2.0.0-beta.40...appium@2.0.0-beta.41) (2022-07-28)

### Bug Fixes

- **appium,support:** fix installation problems ([2a6a056](https://github.com/appium/appium/commit/2a6a056187ce925d5776b7acc4954b10ecf9221b)), closes [#17073](https://github.com/appium/appium/issues/17073)
- **appium,types:** include @appium/types in appium ([a0a6166](https://github.com/appium/appium/commit/a0a6166738f3db32f2512681914c4c5410cd4b28))
- **appium:** fix incorrect count of errors and warnings ([1e42c23](https://github.com/appium/appium/commit/1e42c2378cb762d5f327139c027e2071918b5c17))
- **appium:** postinstall: never assume local appium if it is being installed globally ([965752f](https://github.com/appium/appium/commit/965752f288ba5d74ab24f41d780c46cc8ff14984)), closes [#17054](https://github.com/appium/appium/issues/17054)
- **appium:** remove references to js in typescript code ([d3f90d5](https://github.com/appium/appium/commit/d3f90d5ed6e887feffcabfc8aabd012e43c37e63))
- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))
- Update the way build info is fetched from GitHub ([#17078](https://github.com/appium/appium/issues/17078)) ([d2a3adc](https://github.com/appium/appium/commit/d2a3adc2e361d5f0cff11094e8884e3270f5c94c))

### Features

- **appium,base-driver,base-plugin,test-support,types:** move test fixtures into test-support ([70d88cb](https://github.com/appium/appium/commit/70d88cb86f28354efe313cc6be6a0afef20b38b3))

# [2.0.0-beta.40](https://github.com/appium/appium/compare/appium@2.0.0-beta.39...appium@2.0.0-beta.40) (2022-06-04)

**Note:** Version bump only for package appium

# [2.0.0-beta.39](https://github.com/appium/appium/compare/appium@2.0.0-beta.38...appium@2.0.0-beta.39) (2022-06-03)

**Note:** Version bump only for package appium

# [2.0.0-beta.38](https://github.com/appium/appium/compare/appium@2.0.0-beta.37...appium@2.0.0-beta.38) (2022-06-01)

**Note:** Version bump only for package appium

# [2.0.0-beta.37](https://github.com/appium/appium/compare/appium@2.0.0-beta.36...appium@2.0.0-beta.37) (2022-05-31)

**Note:** Version bump only for package appium

# [2.0.0-beta.36](https://github.com/appium/appium/compare/appium@2.0.0-beta.35...appium@2.0.0-beta.36) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

### Features

- **appium,support:** extension check improvements ([6b224f5](https://github.com/appium/appium/commit/6b224f545f44b8e6ad9d587c7157bc67d7d11439))
- **appium:** appium now expects extensions to use peer dependencies ([48f1d99](https://github.com/appium/appium/commit/48f1d990871dbcd4ab3042c19dc4f43ca89bf80f))

# [2.0.0-beta.35](https://github.com/appium/appium/compare/appium@2.0.0-beta.34...appium@2.0.0-beta.35) (2022-05-03)

**Note:** Version bump only for package appium

# [2.0.0-beta.34](https://github.com/appium/appium/compare/appium@2.0.0-beta.33...appium@2.0.0-beta.34) (2022-05-02)

**Note:** Version bump only for package appium

# [2.0.0-beta.33](https://github.com/appium/appium/compare/appium@2.0.0-beta.32...appium@2.0.0-beta.33) (2022-04-20)

**Note:** Version bump only for package appium

# [2.0.0-beta.32](https://github.com/appium/appium/compare/appium@2.0.0-beta.31...appium@2.0.0-beta.32) (2022-04-20)

**Note:** Version bump only for package appium

# [2.0.0-beta.31](https://github.com/appium/appium/compare/appium@2.0.0-beta.30...appium@2.0.0-beta.31) (2022-04-20)

### Bug Fixes

- **appium,types:** avoid call to assignServer() ([cd08daf](https://github.com/appium/appium/commit/cd08dafabcc16e718a5bdc6b96d5a7bcbfe6e1be))
- **appium:** fix some argument-related types ([37cb3bd](https://github.com/appium/appium/commit/37cb3bd80c76f003940e680b7925b5c3bdc5144c))
- **appium:** make types actually consumable ([8b814c9](https://github.com/appium/appium/commit/8b814c9243a7b51ecd0bc619146063aa5b0ccb76))

# [2.0.0-beta.30](https://github.com/appium/appium/compare/appium@2.0.0-beta.29...appium@2.0.0-beta.30) (2022-04-12)

**Note:** Version bump only for package appium

# [2.0.0-beta.29](https://github.com/appium/appium/compare/appium@2.0.0-beta.28...appium@2.0.0-beta.29) (2022-04-12)

### Bug Fixes

- **appium:** Properly detect if a command is a session command ([#16737](https://github.com/appium/appium/issues/16737)) ([f8a5144](https://github.com/appium/appium/commit/f8a51443e490d9a373778499bfc440e8464ca2ed))

# [2.0.0-beta.28](https://github.com/appium/appium/compare/appium@2.0.0-beta.27...appium@2.0.0-beta.28) (2022-04-07)

### Bug Fixes

- **appium:** allow multiple drivers to be installed ([0bbec13](https://github.com/appium/appium/commit/0bbec13d1e386b2fdf3f9cdcb43da78d6834f28f)), closes [#16674](https://github.com/appium/appium/issues/16674)

### Features

- **appium:** generate declaration files ([#16597](https://github.com/appium/appium/issues/16597)) ([06a6054](https://github.com/appium/appium/commit/06a605420d761a830be267f0f96e12f4caa2c534))

# [2.0.0-beta.27](https://github.com/appium/appium/compare/appium@2.0.0-beta.26...appium@2.0.0-beta.27) (2022-03-23)

### Bug Fixes

- **base-driver:** Use WeakRef to reference the driver instance in the log prefix generator ([#16636](https://github.com/appium/appium/issues/16636)) ([bbfc7ef](https://github.com/appium/appium/commit/bbfc7ef51d8a5c7e99072ee599ce2a6265017ea4))

# [2.0.0-beta.26](https://github.com/appium/appium/compare/appium@2.0.0-beta.25...appium@2.0.0-beta.26) (2022-03-22)

### Bug Fixes

- **appium:** Increase the default limit of process listeners ([#16471](https://github.com/appium/appium/issues/16471)) ([a8315f3](https://github.com/appium/appium/commit/a8315f3f87862b3deeae90b4e21b133e9e3e78d5))
- **appium:** make sure logsink init happens first since it patches npmlog globally (fix [#16519](https://github.com/appium/appium/issues/16519)) ([5abf852](https://github.com/appium/appium/commit/5abf85204614b47d2363097a5356f4bddf697352))
- **appium:** remove bad log ([1dbeee2](https://github.com/appium/appium/commit/1dbeee200677a9c0452bb8c24d78da1e2b5e181c))

### Features

- **appium:** allow installation of extensions via `npm` ([d89fb9b](https://github.com/appium/appium/commit/d89fb9b354b274f2ba410527d25d73af6743d76c))
- **support:** move npm module into support ([2fbd49f](https://github.com/appium/appium/commit/2fbd49fed4cdf10fe1f4b374b5b44ae327ab3f85))

# [2.0.0-beta.25](https://github.com/appium/appium/compare/appium@2.0.0-beta.24...appium@2.0.0-beta.25) (2022-01-21)

### Bug Fixes

- **appium:** make show-config more right ([7470ed0](https://github.com/appium/appium/commit/7470ed00b2a8a8ebc39d62184a6ba5819b22f264)), closes [#16340](https://github.com/appium/appium/issues/16340)

# [2.0.0-beta.24](https://github.com/appium/appium/compare/appium@2.0.0-beta.23...appium@2.0.0-beta.24) (2022-01-11)

### Bug Fixes

- **appium:** correctly apply extension defaults ([20d95e4](https://github.com/appium/appium/commit/20d95e45313fc6aac30a2cf7b8f7bef156a17851))
- **appium:** disallow unsupported schemas ([e074fee](https://github.com/appium/appium/commit/e074fee89f90a654407d01d3f3aea6b839bbf24f))
- **appium:** fix behavior of ReadonlyMap to be compatible with Map ([88e351f](https://github.com/appium/appium/commit/88e351fc2da682bb4c8607259e001ed7e0f5d964))
- **appium:** fix incorrect handling of delete session with regard to plugin driver assignment ([7b3893a](https://github.com/appium/appium/commit/7b3893a36202018de7c2124c2028bfbbd8a9d7fd))
- **appium:** make object dumps less weird ([74a5911](https://github.com/appium/appium/commit/74a5911515f6c50f71fe6f18ddaa4f4fd2ed6d43))
- Switch colors package to a non-compomised repository ([#16317](https://github.com/appium/appium/issues/16317)) ([40a6f05](https://github.com/appium/appium/commit/40a6f054dca3d94fc88773af9c6336ba12ebfb81))

### Features

- **appium:** add --show-config ([#16207](https://github.com/appium/appium/issues/16207)) ([af96879](https://github.com/appium/appium/commit/af96879cfdbbe40773182c29a49fbf2f3cf7e233)), closes [#15672](https://github.com/appium/appium/issues/15672)

# [2.0.0-beta.23](https://github.com/appium/appium/compare/appium@2.0.0-beta.22...appium@2.0.0-beta.23) (2021-11-23)

### Features

- **appium:** make server host/port information available to drivers and thereby plugins ([221a3ec](https://github.com/appium/appium/commit/221a3ecd5211fadcd375fe6d6c9df11f1af201a2))

# [2.0.0-beta.22](https://github.com/appium/appium/compare/appium@2.0.0-beta.21...appium@2.0.0-beta.22) (2021-11-19)

### Bug Fixes

- **appium:** create cjs wrapper ([24596d6](https://github.com/appium/appium/commit/24596d67b04590acb568322098c88efc190f6318))
- **appium:** enable --relaxed-security ([46a2041](https://github.com/appium/appium/commit/46a2041fbdc80b6210d0214a4d9fb71312d57e1b)), closes [/github.com/appium/appium/discussions/16103#discussioncomment-1655985](https://github.com//github.com/appium/appium/discussions/16103/issues/discussioncomment-1655985)

### Features

- **appium:** support for deprecated arguments ([aa69388](https://github.com/appium/appium/commit/aa69388c7a296d4d1e39a1ba0fbe23035a5ae8c5))

# [2.0.0-beta.21](https://github.com/appium/appium/compare/appium@2.0.0-beta.20...appium@2.0.0-beta.21) (2021-11-16)

### Bug Fixes

- **appium:** resolve-from is a dependency ([5443b57](https://github.com/appium/appium/commit/5443b570adf41042c4735410b1425d248adfd0a9))

# [2.0.0-beta.20](https://github.com/appium/appium/compare/appium@2.0.0-beta.19...appium@2.0.0-beta.20) (2021-11-15)

### Bug Fixes

- **appium:** add missing support for schema-as-object ([e951010](https://github.com/appium/appium/commit/e951010055118f6be1614abe40f5701daacb441c))
- **appium:** add types for parsed argument object ([95dfe24](https://github.com/appium/appium/commit/95dfe24176bb7ff6957b7942164280a3a2fbd155))
- **appium:** avoid deprecation warning from argparse ([fc56662](https://github.com/appium/appium/commit/fc566628f599e8a529f30344d291f2351665c5f7))
- **appium:** bad type name ([a7fa66b](https://github.com/appium/appium/commit/a7fa66bb7dfb321cf2bf7c90e5e739841a8753e9))
- **appium:** fix interaction of plugins with proxying ([7091008](https://github.com/appium/appium/commit/70910087d11100fe47627754ade379a2d3a7ff5d))
- **appium:** if a sessionless plugin is used for createSession, promote it to a session plugin ([3f1bb4c](https://github.com/appium/appium/commit/3f1bb4c9c38046699e6d8be3dcd257bc53345eb9))
- **appium:** properly validates config files containing extension config ([b7c230c](https://github.com/appium/appium/commit/b7c230c1e9da9206ea050387bc72c5dda3b31620))
- **appium:** remove extra logging from config-file ([7381a13](https://github.com/appium/appium/commit/7381a13da3e76f7051639d3ab2ba376fbb625e80))
- **appium:** restore missing call to validate extensions ([1a860ca](https://github.com/appium/appium/commit/1a860cade2fd3eac151c81c4efcd11364ee35479))
- **appium:** stop calling plugins 'sessionless' since the name is immutable ([ead3e07](https://github.com/appium/appium/commit/ead3e0723f912a2c7e825d397fe2d4272ce3d6d0))

### Features

- **appium:** allow plugins to react to unexpected session shutdowns ([fff6b2e](https://github.com/appium/appium/commit/fff6b2eb004166fc147251c513086b72be857fbd))
- **appium:** configuration file and schema support ([d52c36e](https://github.com/appium/appium/commit/d52c36e1eaaccc8b47de514bdeeef55ac348ecb8))

# [2.0.0-beta.19](https://github.com/appium/appium/compare/appium@2.0.0-beta.18...appium@2.0.0-beta.19) (2021-11-09)

**Note:** Version bump only for package appium

# [2.0.0-beta.18](https://github.com/appium/appium/compare/appium@2.0.0-beta.17...appium@2.0.0-beta.18) (2021-09-16)

**Note:** Version bump only for package appium

# [2.0.0-beta.17](https://github.com/appium/appium/compare/appium@2.0.0-beta.16...appium@2.0.0-beta.17) (2021-09-16)

**Note:** Version bump only for package appium

# [2.0.0-beta.16](https://github.com/appium/appium/compare/appium@2.0.0-beta.15...appium@2.0.0-beta.16) (2021-09-15)

### Features

- **appium:** add env var to trigger reloading of extensions ([ff3bb4f](https://github.com/appium/appium/commit/ff3bb4f4b538ee5136fdc6356ca00e09fcdc5533))

# [2.0.0-beta.15](https://github.com/appium/appium/compare/appium@2.0.0-beta.14...appium@2.0.0-beta.15) (2021-09-14)

**Note:** Version bump only for package appium

# [2.0.0-beta.14](https://github.com/appium/appium/compare/appium@2.0.0-beta.13...appium@2.0.0-beta.14) (2021-09-14)

### Features

- **appium:** support plugin-specific args via --plugin-args ([c8f12d1](https://github.com/appium/appium/commit/c8f12d1e95b84e225def500a05fddf440df8991a))

# [2.0.0-beta.13](https://github.com/appium/appium/compare/appium@2.0.0-beta.12...appium@2.0.0-beta.13) (2021-08-16)

# 2.0.0-beta (2021-08-13)

### Bug Fixes

- **appium:** load plugins before main server to allow plugin monkeypatching ([#15441](https://github.com/appium/appium/issues/15441)) ([52f4fc6](https://github.com/appium/appium/commit/52f4fc6a2cbdb612888ab2a23a704be32594a006))
- **appium:** update references to @appium/support ([9295d0c](https://github.com/appium/appium/commit/9295d0c68284443ecd73add1f8fe0ff7910a7d7d))
- **appium:** use proper base driver package & random ports ([e14d4fb](https://github.com/appium/appium/commit/e14d4fbd0fce16f208569b0cb9149b6307f78a5f))
- **appium:** when updating extensions, make sure to actually remove the previous one first to avoid npm reinstall issues ([4839419](https://github.com/appium/appium/commit/483941974881bf2ad362c6e6cc35883743abcd2a))
- **appium:** when updating extensions, package fields should also be updated in extensions.yaml ([756688b](https://github.com/appium/appium/commit/756688bddb624a6e9a5b5b6403db76eac65774f3))
- do not assume git root and package.json have the same parent dir ([3c5fba7](https://github.com/appium/appium/commit/3c5fba7b38e02f4216d3a26340948d070f7ea9d9))
- doc generation ([9e33c7a](https://github.com/appium/appium/commit/9e33c7ac1135306c6f0d1ff83b8076aecb54c554))
- e2e-tests ([2499b49](https://github.com/appium/appium/commit/2499b49936660280eefaeb26cb3e4e9f82e36c20))
- use random test port ([935b1f8](https://github.com/appium/appium/commit/935b1f80a47e89ccdf81781f35be5123bf8673d5))

### Features

- add "run" command to the client interface in order to allow running driver-defined scripts ([#15356](https://github.com/appium/appium/issues/15356)) ([a265476](https://github.com/appium/appium/commit/a2654762b6a9156380bcdf53df4cb0a8deb061fa))
- **appium:** Add driver and plugin server arg injection feature ([#15388](https://github.com/appium/appium/issues/15388)) ([d3c11e3](https://github.com/appium/appium/commit/d3c11e364dffff87ac38ac8dc3ad65a1e4534a9a))
