# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [9.16.4](https://github.com/appium/appium/compare/@appium/base-driver@9.16.3...@appium/base-driver@9.16.4) (2025-03-17)


### Bug Fixes

* **base-driver:** Exclude proxied headers from the server response ([#21120](https://github.com/appium/appium/issues/21120)) ([f800c9d](https://github.com/appium/appium/commit/f800c9d760ab3271532c42a507fbaf2bf190fc4b))



## [9.16.3](https://github.com/appium/appium/compare/@appium/base-driver@9.16.2...@appium/base-driver@9.16.3) (2025-03-11)


### Bug Fixes

* **base-driver:** Fix proxy url generation ([#21099](https://github.com/appium/appium/issues/21099)) ([e68757b](https://github.com/appium/appium/commit/e68757b3493a5b0f961f7136c0ae6e857d806f09))
* **base-driver:** Tune capabilities array parsing ([#21044](https://github.com/appium/appium/issues/21044)) ([594bc04](https://github.com/appium/appium/commit/594bc04c03fb073cd7ad31d7e23f77fb8041b92e))
* **base-driver:** Update parseCapsArray function types ([#21045](https://github.com/appium/appium/issues/21045)) ([5541142](https://github.com/appium/appium/commit/554114203fbe26f303337f049f942e046c815074))



## [9.16.2](https://github.com/appium/appium/compare/@appium/base-driver@9.16.1...@appium/base-driver@9.16.2) (2025-02-20)


### Bug Fixes

* **base-driver:** Restore the legacy proxy url behaviour ([#21021](https://github.com/appium/appium/issues/21021)) ([dd64a48](https://github.com/appium/appium/commit/dd64a48fca047a728ad109d525bc4787daa75edc))



## [9.16.1](https://github.com/appium/appium/compare/@appium/base-driver@9.16.0...@appium/base-driver@9.16.1) (2025-02-20)


### Bug Fixes

* **base-driver:** Optimize the logic of getUrlForProxy ([#21018](https://github.com/appium/appium/issues/21018)) ([8a664a4](https://github.com/appium/appium/commit/8a664a4eef97f45c5bdf7f19708149488b63d7fc))



## [9.16.0](https://github.com/appium/appium/compare/@appium/base-driver@9.15.0...@appium/base-driver@9.16.0) (2025-02-19)


### Features

* Add /appium/extensions API to list available extensions ([#20931](https://github.com/appium/appium/issues/20931)) ([a6b6077](https://github.com/appium/appium/commit/a6b6077ecd0749598f52d9f29b3220f47d7ad636))
* add /appium/sessions, /session/:sessionId/appium/capabilities and deprecated marks will be removed in the future ([#20936](https://github.com/appium/appium/issues/20936)) ([eeb59ca](https://github.com/appium/appium/commit/eeb59cab071fdafa44f091e9d0e2676414c85c5d))
* Add BiDi commands to the listCommands API output ([#20925](https://github.com/appium/appium/issues/20925)) ([2635dcb](https://github.com/appium/appium/commit/2635dcb457be2dc02dfbee5ad4c6ab132f5af8de))
* **appium:** Add a command line parameter to configure HTTP server request timeout ([#21003](https://github.com/appium/appium/issues/21003)) ([eb1b156](https://github.com/appium/appium/commit/eb1b156146bc338da9c6ded5a2c5beab22ac0ed8))
* **base-driver:** Add an API to list commands ([#20914](https://github.com/appium/appium/issues/20914)) ([059f1cb](https://github.com/appium/appium/commit/059f1cb698ccdbc58494af9303c5bf264a1893d9))
* **base-driver:** Print the closest match if the given script did not match ([#20956](https://github.com/appium/appium/issues/20956)) ([f8b5799](https://github.com/appium/appium/commit/f8b57999e5a4a13a089cff12954de5d99c8a35fc))


### Bug Fixes

* **driver-test-support:** update definitelytyped ([#20942](https://github.com/appium/appium/issues/20942)) ([f7c63ee](https://github.com/appium/appium/commit/f7c63ee5d87be21eba577a4cfd0b0a08a050afeb))
* **types:** update dependency type-fest to v4.32.0 ([#20900](https://github.com/appium/appium/issues/20900)) ([fbc8530](https://github.com/appium/appium/commit/fbc85308a5398e7c9966792da713e60e47ed7f00))
* **types:** update dependency type-fest to v4.33.0 ([#20923](https://github.com/appium/appium/issues/20923)) ([2409d32](https://github.com/appium/appium/commit/2409d3223a77aa7e84e0cb05a70be3bfa0c69157))
* **types:** update dependency type-fest to v4.34.1 ([#20971](https://github.com/appium/appium/issues/20971)) ([0a7490e](https://github.com/appium/appium/commit/0a7490ed53ccfa9243df779e74bafadfc8415c87))
* **types:** update dependency type-fest to v4.35.0 ([#20999](https://github.com/appium/appium/issues/20999)) ([3dc7336](https://github.com/appium/appium/commit/3dc7336b5fce10b9c1b095cd7a8a1841dbc3de12))



## [9.15.0](https://github.com/appium/appium/compare/@appium/base-driver@9.14.1...@appium/base-driver@9.15.0) (2025-01-08)


### Features

* **appium,base-driver,base-plugin:** allow plugins to define custom bidi commands and emit bidi events ([#20876](https://github.com/appium/appium/issues/20876)) ([8df1c21](https://github.com/appium/appium/commit/8df1c217a15d30300c04b9f59cdbdffa70325828))



## [9.14.1](https://github.com/appium/appium/compare/@appium/base-driver@9.14.0...@appium/base-driver@9.14.1) (2025-01-06)


### Bug Fixes

* **driver-test-support:** update dependency @types/lodash to v4.17.14 ([#20877](https://github.com/appium/appium/issues/20877)) ([fe209ed](https://github.com/appium/appium/commit/fe209ed660e0f790c98cd51938d0c75712cfd8e4))



## [9.14.0](https://github.com/appium/appium/compare/@appium/base-driver@9.13.1...@appium/base-driver@9.14.0) (2025-01-02)


### Features

* **appium:** Add session.status BiDi command ([#20839](https://github.com/appium/appium/issues/20839)) ([64e768e](https://github.com/appium/appium/commit/64e768efb7bebd6b5a24d55206d1cad00812777c))
* **appium:** allow drivers to define their own bidi commands ([#20828](https://github.com/appium/appium/issues/20828)) ([a917ec6](https://github.com/appium/appium/commit/a917ec6ceda2166fb3dcbff6b2768f700db9e103))


### Bug Fixes

* **base-driver:** Return an empty object if the corresponding API response is undefined ([#20845](https://github.com/appium/appium/issues/20845)) ([c765bc3](https://github.com/appium/appium/commit/c765bc31e03d37ed194fcd52f4e4a2ca1128b260))
* **base-driver:** update dependency express to v4.21.2 ([#20823](https://github.com/appium/appium/issues/20823)) ([c032352](https://github.com/appium/appium/commit/c032352fade2146cdce5feb0906726ad07a30e4f))
* Reduce linter warnings ([#20860](https://github.com/appium/appium/issues/20860)) ([65658cc](https://github.com/appium/appium/commit/65658ccbdde9144c45cb5aad6a9089a5d6f3a0a3))
* **types:** update dependency type-fest to v4 ([#20838](https://github.com/appium/appium/issues/20838)) ([a5897dd](https://github.com/appium/appium/commit/a5897dd25a277a42b0c650a52274ba2c891ac3b0))
* **types:** update dependency type-fest to v4 ([#20843](https://github.com/appium/appium/issues/20843)) ([7abecad](https://github.com/appium/appium/commit/7abecaddd3ed64c7be321650b2a17990e74a7222))
* **types:** update dependency type-fest to v4.31.0 ([#20857](https://github.com/appium/appium/issues/20857)) ([24abb38](https://github.com/appium/appium/commit/24abb385e54f57457c4fb3f2b654cb63645e7ccd))



## [9.13.1](https://github.com/appium/appium/compare/@appium/base-driver@9.13.0...@appium/base-driver@9.13.1) (2024-12-05)


### Bug Fixes

* **base-driver:** add * always for non-separator for backward compatibility ([#20821](https://github.com/appium/appium/issues/20821)) ([6ea0830](https://github.com/appium/appium/commit/6ea0830319c204097233d0659e21b3447b624431))
* **base-driver:** update dependency @types/method-override to v3 ([#20799](https://github.com/appium/appium/issues/20799)) ([42ef484](https://github.com/appium/appium/commit/42ef4841f9a379d8e9ce531eb5375eab03902e3f))
* **support:** update dependency axios to v1.7.9 ([#20811](https://github.com/appium/appium/issues/20811)) ([69f100a](https://github.com/appium/appium/commit/69f100ad3e12030708dee4b8a74005dd41976e37))
* **types:** update dependency type-fest to v4.30.0 ([#20802](https://github.com/appium/appium/issues/20802)) ([8590432](https://github.com/appium/appium/commit/8590432955eb7663e35847db541b9ead3f845a36))



## [9.13.0](https://github.com/appium/appium/compare/@appium/base-driver@9.12.2...@appium/base-driver@9.13.0) (2024-12-02)


### Features

* **base-driver:** Allow to prefix feature names with automation names ([#20793](https://github.com/appium/appium/issues/20793)) ([942057d](https://github.com/appium/appium/commit/942057d26cbf51539f34b6b7ff8a3c1d07821687))


### Bug Fixes

* **types:** update dependency type-fest to v4.29.1 ([#20795](https://github.com/appium/appium/issues/20795)) ([6ba31fe](https://github.com/appium/appium/commit/6ba31fe5766f69cb010a4cac81233f4c3cbcf80f))



## [9.12.2](https://github.com/appium/appium/compare/@appium/base-driver@9.12.1...@appium/base-driver@9.12.2) (2024-11-29)


### Bug Fixes

* **driver-test-support:** update definitelytyped ([e3bce2b](https://github.com/appium/appium/commit/e3bce2b6be0ea072ec5e8472c0e191bdfea52a06))
* **support:** update dependency axios to v1.7.8 ([#20778](https://github.com/appium/appium/issues/20778)) ([f9920e2](https://github.com/appium/appium/commit/f9920e2c1b02e3587e5d5fa00ac59055ab57fedd))
* **types:** update dependency type-fest to v4.27.0 ([#20754](https://github.com/appium/appium/issues/20754)) ([d6b4079](https://github.com/appium/appium/commit/d6b40797d387711df94c29984af91308da27f92b))
* **types:** update dependency type-fest to v4.28.0 ([#20775](https://github.com/appium/appium/issues/20775)) ([a25d8f1](https://github.com/appium/appium/commit/a25d8f129c8baf76ab40ce3b8d053f7da77f14b3))
* **types:** update dependency type-fest to v4.29.0 ([#20783](https://github.com/appium/appium/issues/20783)) ([b6aa5ac](https://github.com/appium/appium/commit/b6aa5ace6e54709dba54bc62a902d91851ab7ef1))



## [9.12.1](https://github.com/appium/appium/compare/@appium/base-driver@9.12.0...@appium/base-driver@9.12.1) (2024-10-24)


### Bug Fixes

* **driver-test-support:** update definitelytyped ([958fca4](https://github.com/appium/appium/commit/958fca47c8515664aac4c2f0b1051cadd43431b9))



## [9.12.0](https://github.com/appium/appium/compare/@appium/base-driver@9.11.5...@appium/base-driver@9.12.0) (2024-10-15)


### Features

* **appium:** Make server graceful shutdown timeout configurable via command line args ([#20641](https://github.com/appium/appium/issues/20641)) ([5661888](https://github.com/appium/appium/commit/56618886ed007df3c28ce98beb4ff91bc47da2a2))


### Bug Fixes

* **base-driver:** update dependency express to v4.21.1 ([0e52da4](https://github.com/appium/appium/commit/0e52da4b3adbd5ecde09395063255c3af7eb0400))
* **base-driver:** update dependency path-to-regexp to v8.2.0 ([e8886ae](https://github.com/appium/appium/commit/e8886ae0d276ac4f97a1bdb88998fc30fbd936fa))
* **driver-test-support:** update dependency @types/lodash to v4.17.10 ([a2b0ba8](https://github.com/appium/appium/commit/a2b0ba877310737f1ebf7ecda0b9aa5d7083e1f4))
* **types:** update dependency @types/express to v5 ([#20620](https://github.com/appium/appium/issues/20620)) ([69e9abe](https://github.com/appium/appium/commit/69e9abeed3ac5a2f61d8b7f1cd4ec4bd9c054cf1))



## [9.11.5](https://github.com/appium/appium/compare/@appium/base-driver@9.11.4...@appium/base-driver@9.11.5) (2024-09-26)


### Bug Fixes

* **appium:** Return hostname as web socket url for BiDi if a broadcast address is assigned to the server ([#20603](https://github.com/appium/appium/issues/20603)) ([f0de55d](https://github.com/appium/appium/commit/f0de55da0da2fc0305876a948704c1f0a2a5990f))
* **driver-test-support:** update definitelytyped ([#20605](https://github.com/appium/appium/issues/20605)) ([da7a4fd](https://github.com/appium/appium/commit/da7a4fdce8790bc59370bfe4b912c7c0c403c713))



## [9.11.4](https://github.com/appium/appium/compare/@appium/base-driver@9.11.3...@appium/base-driver@9.11.4) (2024-09-16)


### Bug Fixes

* **base-driver:** Add a server flag to check if it operates a secure protocol ([#20449](https://github.com/appium/appium/issues/20449)) ([622b245](https://github.com/appium/appium/commit/622b245ea38793280d9785a59a0416ce025862fe))
* **base-driver:** update dependency body-parser to v1.20.3 ([056baba](https://github.com/appium/appium/commit/056baba3a0c51973d5e834283355821eced6ee17))
* **base-driver:** update dependency express to v4.20.0 ([ef163eb](https://github.com/appium/appium/commit/ef163eb8df512e89f4e62c99b32fc979008fcfaa))
* **base-driver:** update dependency express to v4.21.0 ([cb9fb9c](https://github.com/appium/appium/commit/cb9fb9c6fef608e29284210be27356a488f4002c))
* **base-driver:** update dependency path-to-regexp to v8 ([#20520](https://github.com/appium/appium/issues/20520)) ([63cb664](https://github.com/appium/appium/commit/63cb664af13d7411ff325095cd0e9b6fd24363c3))
* **base-driver:** update dependency path-to-regexp to v8.1.0 ([#20562](https://github.com/appium/appium/issues/20562)) ([1cae549](https://github.com/appium/appium/commit/1cae549a7be5138e980af6661b96cd7d6268fdb0))
* **support:** update dependency axios to v1.7.4 ([d17d022](https://github.com/appium/appium/commit/d17d0222245ab94a78e578c0398734e65a89ba68))
* **support:** update dependency axios to v1.7.5 ([fedabb1](https://github.com/appium/appium/commit/fedabb1fdc7af10f9e4b06ea23815c4bc7c6bf5e))
* **support:** update dependency axios to v1.7.7 ([7fe67a2](https://github.com/appium/appium/commit/7fe67a286a15a917ce3b1b47a08e982e65bbd9e4))
* **types:** update dependency type-fest to v4 ([#20467](https://github.com/appium/appium/issues/20467)) ([482a1f7](https://github.com/appium/appium/commit/482a1f7bbfbf6478ee09bb1668b830ddbf13b143))
* **types:** update dependency type-fest to v4 ([#20471](https://github.com/appium/appium/issues/20471)) ([9a66f48](https://github.com/appium/appium/commit/9a66f4800141cc86c90d58ca1103bab0066081bc))
* **types:** update dependency type-fest to v4 ([#20548](https://github.com/appium/appium/issues/20548)) ([5b8cb76](https://github.com/appium/appium/commit/5b8cb76ea3cda75095e79c91539be73feeadf869))
* **types:** update dependency type-fest to v4.26.0 ([#20511](https://github.com/appium/appium/issues/20511)) ([8f20c97](https://github.com/appium/appium/commit/8f20c973f4a6d3380163b6afd7f113808453a62d))



## [9.11.3](https://github.com/appium/appium/compare/@appium/base-driver@9.11.2...@appium/base-driver@9.11.3) (2024-08-07)


### Bug Fixes

* **base-driver:** calls startNewCommandTimeout before returning NotYetImplementedError ([#20380](https://github.com/appium/appium/issues/20380)) ([6a97fe4](https://github.com/appium/appium/commit/6a97fe48aebb85424fa7e5be5de2eb5524cf0db6))
* **base-driver:** change required to option for setWindowRect to follow w3c ([#20391](https://github.com/appium/appium/issues/20391)) ([9eb65f7](https://github.com/appium/appium/commit/9eb65f7ad4efc89bbf5af89791bb9eb81fc2248f))
* **base-driver:** Start command timeout even if the recent command has thrown an exception ([#20379](https://github.com/appium/appium/issues/20379)) ([139dbae](https://github.com/appium/appium/commit/139dbaeef6963f79a1de38541181bae8953e00e1))
* **base-driver:** update dependency path-to-regexp to v7.1.0 ([#20376](https://github.com/appium/appium/issues/20376)) ([6488a0a](https://github.com/appium/appium/commit/6488a0a4e1dd08f4eda6e40e33a9b31d31edda1c))
* **driver-test-support:** update dependency @types/lodash to v4.17.7 ([#20382](https://github.com/appium/appium/issues/20382)) ([d5ef0f9](https://github.com/appium/appium/commit/d5ef0f9c8608ba545988c3016cefd0669f2400dc))
* **logger:** update dependency lru-cache to v10.4.3 ([#20364](https://github.com/appium/appium/issues/20364)) ([8d79467](https://github.com/appium/appium/commit/8d79467da8a0733ac3e49b9152bd6905989a57ca))
* **support:** update dependency axios to v1.7.3 ([1ca77c6](https://github.com/appium/appium/commit/1ca77c6dedbff4552aba9c97cf5406c7552d1a01))
* **types:** update dependency type-fest to v4.22.0 ([#20387](https://github.com/appium/appium/issues/20387)) ([47405dd](https://github.com/appium/appium/commit/47405dda8a5de17c72fb721b0c043e0dd4f6b35a))
* **types:** update dependency type-fest to v4.23.0 ([#20396](https://github.com/appium/appium/issues/20396)) ([0e8e3c7](https://github.com/appium/appium/commit/0e8e3c71441d02d22f015f08df5223909f5fbb93))



## [9.11.2](https://github.com/appium/appium/compare/@appium/base-driver@9.11.1...@appium/base-driver@9.11.2) (2024-07-10)


### Bug Fixes

* **types:** update dependency type-fest to v4.21.0 ([#20335](https://github.com/appium/appium/issues/20335)) ([8894b9a](https://github.com/appium/appium/commit/8894b9adf709646108cc8d6426bbb690550609f2))



## [9.11.1](https://github.com/appium/appium/compare/@appium/base-driver@9.11.0...@appium/base-driver@9.11.1) (2024-06-28)


### Bug Fixes

* **driver-test-support:** update dependency @types/lodash to v4.17.6 ([82e40c1](https://github.com/appium/appium/commit/82e40c1400e23f341c45d788982ccc5905827d7c))
* **images-plugin:** update dependency lru-cache to v10.3.0 ([#20306](https://github.com/appium/appium/issues/20306)) ([e43c7a4](https://github.com/appium/appium/commit/e43c7a4dce1f50fbd4d028cbeac5677422210b20))



## [9.11.0](https://github.com/appium/appium/compare/@appium/base-driver@9.10.3...@appium/base-driver@9.11.0) (2024-06-27)


### Features

* **appium:** Improve context logging ([#20250](https://github.com/appium/appium/issues/20250)) ([f675abc](https://github.com/appium/appium/commit/f675abc27b3e6beac2431cc71afb5fc2c2f70534))


### Bug Fixes

* **base-driver:** Check if app path is relative earlier ([#20276](https://github.com/appium/appium/issues/20276)) ([2882e71](https://github.com/appium/appium/commit/2882e7163159b7918d54cc4521105a1fdf55da9a))
* **base-driver:** update dependency path-to-regexp to v7 ([#20279](https://github.com/appium/appium/issues/20279)) ([a746eef](https://github.com/appium/appium/commit/a746eefbbb627c7f7dd9d1ce13226a88d9527129))
* **types:** update dependency type-fest to v4.20.1 ([#20255](https://github.com/appium/appium/issues/20255)) ([1984553](https://github.com/appium/appium/commit/19845531f558e2b16dfae807c768e1b9f2cab25d))



## [9.10.3](https://github.com/appium/appium/compare/@appium/base-driver@9.10.2...@appium/base-driver@9.10.3) (2024-06-11)

**Note:** Version bump only for package @appium/base-driver





## [9.10.2](https://github.com/appium/appium/compare/@appium/base-driver@9.10.1...@appium/base-driver@9.10.2) (2024-06-11)

**Note:** Version bump only for package @appium/base-driver





## [9.10.1](https://github.com/appium/appium/compare/@appium/base-driver@9.10.0...@appium/base-driver@9.10.1) (2024-06-11)

**Note:** Version bump only for package @appium/base-driver





## [9.10.0](https://github.com/appium/appium/compare/@appium/base-driver@9.9.0...@appium/base-driver@9.10.0) (2024-06-10)


### Features

* **appium:** Add session signature to all logs ([#20202](https://github.com/appium/appium/issues/20202)) ([#20214](https://github.com/appium/appium/issues/20214)) ([0363aab](https://github.com/appium/appium/commit/0363aab8ba4fe0ec49845db2f493001aa873578b)), closes [#20222](https://github.com/appium/appium/issues/20222)


### Bug Fixes

* **driver-test-support:** update dependency @types/lodash to v4.17.5 ([69bbb53](https://github.com/appium/appium/commit/69bbb5370e671d2809a5bf997936b0b3cc1a0a0b))
* **types:** update dependency type-fest to v4.20.0 ([#20227](https://github.com/appium/appium/issues/20227)) ([ea00626](https://github.com/appium/appium/commit/ea00626091e3ce87f6e3ed7a61003295272835e3))



## [9.9.0](https://github.com/appium/appium/compare/@appium/base-driver@9.8.1...@appium/base-driver@9.9.0) (2024-06-06)


### Features

* **appium:** Add session signature to all logs ([#20202](https://github.com/appium/appium/issues/20202)) ([b3f8a47](https://github.com/appium/appium/commit/b3f8a47c2d3fa029bdb5592d7130c6d1664e53b5))


### Bug Fixes

* **appium:** Revert changes in 20203 and 20202 ([#20209](https://github.com/appium/appium/issues/20209)) ([40def9d](https://github.com/appium/appium/commit/40def9dbdbde64706111900967d66735257b7404)), closes [#20202](https://github.com/appium/appium/issues/20202) [#20203](https://github.com/appium/appium/issues/20203)



## [9.8.1](https://github.com/appium/appium/compare/@appium/base-driver@9.8.0...@appium/base-driver@9.8.1) (2024-06-06)

**Note:** Version bump only for package @appium/base-driver





## [9.8.0](https://github.com/appium/appium/compare/@appium/base-driver@9.7.0...@appium/base-driver@9.8.0) (2024-06-06)


### Features

* **base-driver:** Make addition of search query params to cache optional ([#20195](https://github.com/appium/appium/issues/20195)) ([21316e9](https://github.com/appium/appium/commit/21316e94d05b2f97aa0349a82da229713e92446c))


### Bug Fixes

* **types:** update dependency type-fest to v4.19.0 ([#20193](https://github.com/appium/appium/issues/20193)) ([db62358](https://github.com/appium/appium/commit/db62358dbac25de2a75fdc7493338d98b1422c84))



## [9.7.0](https://github.com/appium/appium/compare/@appium/base-driver@9.6.0...@appium/base-driver@9.7.0) (2024-05-27)


### Features

* **base-driver:** Add env variables to control applications cache ([#20042](https://github.com/appium/appium/issues/20042)) ([4e8c91c](https://github.com/appium/appium/commit/4e8c91c8f647e545344d5b49282628413e1ccb19))
* **base-driver:** Add the original app link argument to configureApp callbacks ([#20035](https://github.com/appium/appium/issues/20035)) ([3423fd9](https://github.com/appium/appium/commit/3423fd9206f71481bb34919e02a3dc8c5e3bec00))


### Bug Fixes

* **base-driver:** Update the web socket upgrade behavior ([#20142](https://github.com/appium/appium/issues/20142)) ([275790e](https://github.com/appium/appium/commit/275790ec012d0c773b1248c3c2a541301cf0167b))
* **driver-test-support:** update definitelytyped ([a8d36b0](https://github.com/appium/appium/commit/a8d36b0a981daf524bd4af422904193c087a8c2c))
* **images-plugin:** update dependency lru-cache to v10.2.1 ([#20039](https://github.com/appium/appium/issues/20039)) ([f645b50](https://github.com/appium/appium/commit/f645b50d9d6008d374bc131be78d8be5d84a7f53))
* **images-plugin:** update dependency lru-cache to v10.2.2 ([#20052](https://github.com/appium/appium/issues/20052)) ([f8d1fb7](https://github.com/appium/appium/commit/f8d1fb7df7b7d093d3664f58830cad5b5dffa244))
* **support:** update dependency axios to v1.7.1 ([11510cb](https://github.com/appium/appium/commit/11510cb1a5d50a20ced884e5404d0be1e04ff142))
* **support:** update dependency axios to v1.7.2 ([a876f11](https://github.com/appium/appium/commit/a876f112b51dd25f70094b9e75330b9558050e42))
* **types:** update dependency type-fest to v4.18.2 ([#20103](https://github.com/appium/appium/issues/20103)) ([3b43be1](https://github.com/appium/appium/commit/3b43be17321f2ca16bac0abedabf9ef8cffa098a))
* **types:** update dependency type-fest to v4.18.3 ([#20149](https://github.com/appium/appium/issues/20149)) ([d5369f8](https://github.com/appium/appium/commit/d5369f8b08e7439282c5a211e684b154cc9f0051))



## [9.6.0](https://github.com/appium/appium/compare/@appium/base-driver@9.5.4...@appium/base-driver@9.6.0) (2024-04-21)


### Features

* **base-driver:** Add onDownload handler to the configureApp helper ([#20015](https://github.com/appium/appium/issues/20015)) ([8cf3efd](https://github.com/appium/appium/commit/8cf3efdbed6c0868f2d7838e249a3d2478f186d4))



## [9.5.4](https://github.com/appium/appium/compare/@appium/base-driver@9.5.3...@appium/base-driver@9.5.4) (2024-04-16)


### Bug Fixes

* do not print deprecation errors for non-provided caps ([#19986](https://github.com/appium/appium/issues/19986)) ([9f655f6](https://github.com/appium/appium/commit/9f655f6f852bc10ca1f51529183c7c44eb4c79ea))



## [9.5.3](https://github.com/appium/appium/compare/@appium/base-driver@9.5.2...@appium/base-driver@9.5.3) (2024-04-08)


### Bug Fixes

* **base-driver:** update dependency express to v4.18.3 ([917084c](https://github.com/appium/appium/commit/917084ccca23c5483e7d83ce97721061dd2fe345))
* **base-driver:** update dependency express to v4.19.1 ([a74132c](https://github.com/appium/appium/commit/a74132cc96d201bb5c7b7f11a7e3b1b79e7d2424))
* **base-driver:** update dependency express to v4.19.2 ([7cb1621](https://github.com/appium/appium/commit/7cb1621e80bc4225c48833cc2bd02fe80dccd382))
* **base-driver:** update dependency path-to-regexp to v6.2.2 ([#19979](https://github.com/appium/appium/issues/19979)) ([b8368bb](https://github.com/appium/appium/commit/b8368bb666fda44e3b0c45cc7307bff69fe40202))
* **docutils:** update dependency typescript to v5.4.2 ([#19876](https://github.com/appium/appium/issues/19876)) ([2448fa0](https://github.com/appium/appium/commit/2448fa0145620657ccc72b5637f1b7737fe52580))
* **driver-test-support:** update definitelytyped ([4776574](https://github.com/appium/appium/commit/47765747b66c5e0076f6ffe4619d6b98a42aee29))
* **support:** update dependency axios to v1.6.8 ([bd6ab81](https://github.com/appium/appium/commit/bd6ab81c9408ab0f90fc25fc112f9257ec2973ad))



## [9.5.2](https://github.com/appium/appium/compare/@appium/base-driver@9.5.1...@appium/base-driver@9.5.2) (2024-02-13)

**Note:** Version bump only for package @appium/base-driver





## [9.5.1](https://github.com/appium/appium/compare/@appium/base-driver@9.5.0...@appium/base-driver@9.5.1) (2024-02-06)


### Bug Fixes

* **images-plugin:** update dependency lru-cache to v10 ([#19723](https://github.com/appium/appium/issues/19723)) ([202da83](https://github.com/appium/appium/commit/202da83449073ddb3da8fb2cfbcfce482a5ecd40))
* **support:** update dependency axios to v1.6.4 ([332cc48](https://github.com/appium/appium/commit/332cc48a09b5532a8d51f85f3a24785e2c754e00))
* **support:** update dependency axios to v1.6.5 ([#19616](https://github.com/appium/appium/issues/19616)) ([ac73522](https://github.com/appium/appium/commit/ac73522351b31bd6c11972c61daa8b6b8d18fb91))
* **support:** update dependency axios to v1.6.6 ([6313704](https://github.com/appium/appium/commit/6313704ee5a8ee3aee726eb512ef259b6fa1041c))
* **support:** update dependency axios to v1.6.7 ([795092a](https://github.com/appium/appium/commit/795092a97f6d7569cccc4b5c166f52fef821514b))
* **types:** update dependency type-fest to v4.10 ([#19694](https://github.com/appium/appium/issues/19694)) ([966d305](https://github.com/appium/appium/commit/966d305e5eade9369a3875243bcad951df88545c))
* **types:** update dependency type-fest to v4.10.1 ([#19703](https://github.com/appium/appium/issues/19703)) ([501395c](https://github.com/appium/appium/commit/501395c9489320b84ab49ff78af4270f66070d62))



## [9.5.0](https://github.com/appium/appium/compare/@appium/base-driver@9.4.4...@appium/base-driver@9.5.0) (2024-01-03)


### Features

* add webdriver bidi support ([2b21e66](https://github.com/appium/appium/commit/2b21e66891e8ab8c3929f04f32e94eb4efdba691))


### Bug Fixes

* **base-driver:** update dependency async-lock to v1.4.1 ([a304a1f](https://github.com/appium/appium/commit/a304a1f78e658f6f70cbe8e1efd6d06b81d8d34e))
* **support:** update dependency axios to v1.6.3 ([441b284](https://github.com/appium/appium/commit/441b2848dae28472356f37fc5d51ac27af7bbe29))
* **types:** update dependency type-fest to v4 ([#19592](https://github.com/appium/appium/issues/19592)) ([94b3580](https://github.com/appium/appium/commit/94b358022fdba3050ef94c1f881895f07e24fb75))



## [9.4.4](https://github.com/appium/appium/compare/@appium/base-driver@9.4.3...@appium/base-driver@9.4.4) (2023-12-18)


### Bug Fixes

* **docutils:** remove `@appium/typedoc-plugin-appium` and all other uses of `typedoc` ([#19465](https://github.com/appium/appium/issues/19465)) ([7528fcf](https://github.com/appium/appium/commit/7528fcf890f79f4017f5e718bb1952bf907ee479))
* **images-plugin:** update dependency lru-cache to v10 ([#19490](https://github.com/appium/appium/issues/19490)) ([19c30b4](https://github.com/appium/appium/commit/19c30b490b244f52918f72bdeeb957a999fdbcb9))
* **images-plugin:** update dependency lru-cache to v10 ([#19497](https://github.com/appium/appium/issues/19497)) ([4dd95c0](https://github.com/appium/appium/commit/4dd95c096e4e4685c4f464b8251370ea001a562a))
* **types:** update dependency type-fest to v4 ([#19104](https://github.com/appium/appium/issues/19104)) ([8bfa1b5](https://github.com/appium/appium/commit/8bfa1b5a4d090b0102dbb914c9b72aea52d96788))



## [9.4.3](https://github.com/appium/appium/compare/@appium/base-driver@9.4.2...@appium/base-driver@9.4.3) (2023-12-04)


### Bug Fixes

* **support:** update definitelytyped ([2c02be4](https://github.com/appium/appium/commit/2c02be440c21db0bf8a3832143e61ef8fb30a2cf))
* **support:** update dependency axios to v1.6.2 ([fda40e6](https://github.com/appium/appium/commit/fda40e60410e97d5ba5093442aad0b2d63d3d539))



## [9.4.2](https://github.com/appium/appium/compare/@appium/base-driver@9.4.1...@appium/base-driver@9.4.2) (2023-11-14)


### Bug Fixes

* **support:** update definitelytyped ([5ae8df3](https://github.com/appium/appium/commit/5ae8df3c36c7f03fbf3420087b532086f6742348))
* **support:** update dependency axios to v1.6.0 ([699c493](https://github.com/appium/appium/commit/699c49306c38e222d618a9611482b06a3e6806aa))
* **support:** update dependency axios to v1.6.1 ([9b14205](https://github.com/appium/appium/commit/9b14205288ef09fd4a1144fc93c82b2bb2ed2ec0))



## [9.4.1](https://github.com/appium/appium/compare/@appium/base-driver@9.4.0...@appium/base-driver@9.4.1) (2023-10-19)


### Bug Fixes

* **appium:** Make sure type definitions are always in sync across modules ([#19323](https://github.com/appium/appium/issues/19323)) ([de39013](https://github.com/appium/appium/commit/de39013ae501d4fc11988435737efb862cc1d820))
* **support:** update definitelytyped ([a306ce7](https://github.com/appium/appium/commit/a306ce741a806d21bc44f3b979803b8af5da99aa))



## [9.4.0](https://github.com/appium/appium/compare/@appium/base-driver@9.3.20...@appium/base-driver@9.4.0) (2023-10-18)


### Features

* **base-driver:** Add server support of TLS and SPDY protocols ([#19105](https://github.com/appium/appium/issues/19105)) ([5926919](https://github.com/appium/appium/commit/5926919177e3df675723c80d800f933fdbda5824))


### Bug Fixes

* **base-driver:** update definitelytyped ([5e09589](https://github.com/appium/appium/commit/5e095893ee8f65cb8744d2cd6c6abd70f402fa55))
* **base-driver:** update dependency http-status-codes to v2.3.0 ([331171d](https://github.com/appium/appium/commit/331171dd8c511aba15e1b5b24329b30224e3e6ac))
* **driver-test-support:** update dependency @types/lodash to v4.14.198 ([84fefd2](https://github.com/appium/appium/commit/84fefd214c40408cbbcd145723b5d8dbeec665af))
* **images-plugin:** update dependency lru-cache to v10 ([#19050](https://github.com/appium/appium/issues/19050)) ([72a806b](https://github.com/appium/appium/commit/72a806bec7c3a80747192d24dfd9d8286a751810))
* **opencv:** update definitelytyped ([d2a9a99](https://github.com/appium/appium/commit/d2a9a99418af9ce9b569bb9b98ee396faab932bb))
* **support:** update definitelytyped ([3b44c7d](https://github.com/appium/appium/commit/3b44c7d8f5b89f9357dfe6bb56b54799bbe0a921))
* **support:** update definitelytyped ([595d460](https://github.com/appium/appium/commit/595d460ac8dc41d310f9e4f653acbad3c7fd50b9))
* **support:** update definitelytyped ([b6a76ce](https://github.com/appium/appium/commit/b6a76ce91e2765c22f84e389b93f780e0b4490c0))
* **support:** update dependency axios to v1.5.0 ([08913cd](https://github.com/appium/appium/commit/08913cddde295f616f0fb376cc2cb71a9409a253))
* **support:** update dependency axios to v1.5.1 ([#19217](https://github.com/appium/appium/issues/19217)) ([3df047d](https://github.com/appium/appium/commit/3df047d128d5d032826c8f5fb605b019078b717d))
* **types:** update definitelytyped ([96b0a44](https://github.com/appium/appium/commit/96b0a44629c451102c44541a8d5b9e7be972f1ea))
* Use pathToRegexp to match websocket endpoints ([#19162](https://github.com/appium/appium/issues/19162)) ([de02ed8](https://github.com/appium/appium/commit/de02ed87fc665ec9c6e563a634634307c3f21e44))



## [9.3.20](https://github.com/appium/appium/compare/@appium/base-driver@9.3.19...@appium/base-driver@9.3.20) (2023-08-23)


### Bug Fixes

* **base-driver:** Avoid RangeError while caching the response data ([#19043](https://github.com/appium/appium/issues/19043)) ([315a5e6](https://github.com/appium/appium/commit/315a5e6cc75d53d5fbbdae598dc4523ab85b7cb1))
* **base-driver:** fix the LRUCache.dispose callback param order ([#19037](https://github.com/appium/appium/issues/19037)) ([abcf0d4](https://github.com/appium/appium/commit/abcf0d451f47f5c7c285f0988693c4bef9c29024))



## [9.3.19](https://github.com/appium/appium/compare/@appium/base-driver@9.3.18...@appium/base-driver@9.3.19) (2023-08-22)

**Note:** Version bump only for package @appium/base-driver





## [9.3.18](https://github.com/appium/appium/compare/@appium/base-driver@9.3.17...@appium/base-driver@9.3.18) (2023-08-21)


### Bug Fixes

* **base-driver:** Fix possible NPE while cleaning up the state listener ([#19020](https://github.com/appium/appium/issues/19020)) ([53bfc68](https://github.com/appium/appium/commit/53bfc68eee5766ca8c6851c424c89d6b123d602e))
* **base-driver:** Respect basic auth credentials if provided ([#19000](https://github.com/appium/appium/issues/19000)) ([ed8e83c](https://github.com/appium/appium/commit/ed8e83c76c5b660e619833515c2ea2ec29082e18))
* **driver-test-support:** update dependency @types/lodash to v4.14.197 ([a080b72](https://github.com/appium/appium/commit/a080b729208b4e3c352456f0f230b63b0b7ee9ee))



## [9.3.17](https://github.com/appium/appium/compare/@appium/base-driver@9.3.16...@appium/base-driver@9.3.17) (2023-08-17)


### Bug Fixes

* **base-driver:** Tune responses caching logic ([#18922](https://github.com/appium/appium/issues/18922)) ([de5b55a](https://github.com/appium/appium/commit/de5b55ae90fefcce86962a48d5aceb73962e56b6))
* **driver-test-support:** update definitelytyped ([c320e8a](https://github.com/appium/appium/commit/c320e8a1a61cb6d980d6d944ae47b60da97aa398))
* **support:** update dependency glob to v10 ([#18490](https://github.com/appium/appium/issues/18490)) ([aaf31a5](https://github.com/appium/appium/commit/aaf31a577cb0b9cbe22646dcd888dc393a03aa11))
* **test-support:** update dependency @colors/colors to v1.6.0 ([1358937](https://github.com/appium/appium/commit/1358937db2edf08ce1ebe3dff2f70ac6b07cd373))
* **types:** update dependency type-fest to v3.13.1 ([fb34ab9](https://github.com/appium/appium/commit/fb34ab917216121d2b554677a12f07a03393d218))



## [9.3.16](https://github.com/appium/appium/compare/@appium/base-driver@9.3.15...@appium/base-driver@9.3.16) (2023-07-24)


### Bug Fixes

* **base-driver:** Use proper cached headers for app download ([#18874](https://github.com/appium/appium/issues/18874)) ([75650a6](https://github.com/appium/appium/commit/75650a6b744dfcbd50d45972f04040472fdbcd45))



## [9.3.15](https://github.com/appium/appium/compare/@appium/base-driver@9.3.14...@appium/base-driver@9.3.15) (2023-07-03)


### Bug Fixes

* **base-driver:** allow subclass to define shape of settings object ([3d614d6](https://github.com/appium/appium/commit/3d614d6d414d0d34026f516dbfad7d296000efcf))
* **base-driver:** pass thru all type args to ExternalDriver ([2b35170](https://github.com/appium/appium/commit/2b351705d401e2db8da76022989c1475cbdda0f8))
* **types,base-driver:** remove deviceName from base constraints ([01061b2](https://github.com/appium/appium/commit/01061b291981333bdec59adfbea60f0cef3d69c1))
* **types:** separate the type of opts from initialOpts ([d6cca51](https://github.com/appium/appium/commit/d6cca5175c3e55d4670936c9d216cd3a6610d16b))



## [9.3.14](https://github.com/appium/appium/compare/@appium/base-driver@9.3.13...@appium/base-driver@9.3.14) (2023-06-29)

**Note:** Version bump only for package @appium/base-driver





## [9.3.13](https://github.com/appium/appium/compare/@appium/base-driver@9.3.12...@appium/base-driver@9.3.13) (2023-06-15)


### Bug Fixes

* **base-driver:** update def of findElOrEls and findElOrElsWithProcessing ([54a4a8d](https://github.com/appium/appium/commit/54a4a8da030dbecde783168bb92634df837d5a41))
* **types:** various fixes for reality ([81bc527](https://github.com/appium/appium/commit/81bc527be6aa54dd30a012156b5752b8b821ac0c))



## [9.3.12](https://github.com/appium/appium/compare/@appium/base-driver@9.3.11...@appium/base-driver@9.3.12) (2023-06-14)

**Note:** Version bump only for package @appium/base-driver





## [9.3.11](https://github.com/appium/appium/compare/@appium/base-driver@9.3.10...@appium/base-driver@9.3.11) (2023-06-14)


### Bug Fixes

* **schema:** update definitelytyped ([e967240](https://github.com/appium/appium/commit/e96724077ef2b5b8aae203856195f3bb8de56116))
* **types:** update dependency type-fest to v3.11.0 ([19277f6](https://github.com/appium/appium/commit/19277f6e14a56e52b4669d633e148ad4a3da2c7a))
* **types:** update dependency type-fest to v3.11.1 ([56499eb](https://github.com/appium/appium/commit/56499eb997b551739bed628f057de7987674ea7f))



## [9.3.10](https://github.com/appium/appium/compare/@appium/base-driver@9.3.9...@appium/base-driver@9.3.10) (2023-05-19)


### Bug Fixes

* **base-driver:** add missing @types/lodash ([63a429c](https://github.com/appium/appium/commit/63a429c53bf3da353e018ed86ec24e32bf238d18))



## [9.3.9](https://github.com/appium/appium/compare/@appium/base-driver@9.3.8...@appium/base-driver@9.3.9) (2023-05-19)

**Note:** Version bump only for package @appium/base-driver





## [9.3.8](https://github.com/appium/appium/compare/@appium/base-driver@9.3.7...@appium/base-driver@9.3.8) (2023-05-17)


### Bug Fixes

* **base-driver:** Ignore unknown script arguments ([#18575](https://github.com/appium/appium/issues/18575)) ([4f564ef](https://github.com/appium/appium/commit/4f564ef7ad350831b90994ffd4e8b00de227577d))
* **support:** update dependency axios to v1.3.6 ([6692227](https://github.com/appium/appium/commit/66922279b7742a08613f472585a4a1cb70f80683))
* **support:** update dependency axios to v1.4.0 ([91a6bc5](https://github.com/appium/appium/commit/91a6bc5925ab8ffc4ab6d05883900f7d186e49a9))
* **types:** update dependency type-fest to v3.10.0 ([3c4d3ac](https://github.com/appium/appium/commit/3c4d3acc09d2ca1ed74dc77c18c62482e4c70239))
* **types:** update dependency type-fest to v3.9.0 ([94a207f](https://github.com/appium/appium/commit/94a207fc9718068f3657c51cc8be0ef682f16b11))



## [9.3.7](https://github.com/appium/appium/compare/@appium/base-driver@9.3.6...@appium/base-driver@9.3.7) (2023-04-14)


### Bug Fixes

* **basedriver:** allow arbitrary session data to be returned by getSession ([6245022](https://github.com/appium/appium/commit/6245022be953b69acad70d0a4c877bc65eed2d3a))



## [9.3.6](https://github.com/appium/appium/compare/@appium/base-driver@9.3.5...@appium/base-driver@9.3.6) (2023-04-10)


### Bug Fixes

* **support:** update dependency axios to v1.3.5 ([6cf1480](https://github.com/appium/appium/commit/6cf14802b70a462beffc12a1134476596060c005))
* **types:** update dependency type-fest to v3.8.0 ([d6c42e9](https://github.com/appium/appium/commit/d6c42e99c08efce0b34796d5982ce379fca044d3))





## [9.3.5](https://github.com/appium/appium/compare/@appium/base-driver@9.3.4...@appium/base-driver@9.3.5) (2023-04-03)


### Bug Fixes

* **types:** update dependency type-fest to v3.7.2 ([5580539](https://github.com/appium/appium/commit/55805390b5a0c6aa718bb357b30f66651f3db281))





## [9.3.4](https://github.com/appium/appium/compare/@appium/base-driver@9.3.3...@appium/base-driver@9.3.4) (2023-03-28)


### Bug Fixes

* **appium,types,base-driver,fake-driver,driver-test-support:** normalize constraint defaults ([3c9fa7b](https://github.com/appium/appium/commit/3c9fa7ba73b639e610e1f3d41d239a9402845b4c))
* backwards-compatible fixes for TS v5.x ([4974403](https://github.com/appium/appium/commit/49744036619ecc239e0e6255a13d38cafd709920))
* **base-driver,base-plugin,types:** update PluginCommand and DriverCommand types ([0dcd5fa](https://github.com/appium/appium/commit/0dcd5fa371af523c6527e55de4cff6cd472fde22))
* **base-driver,types:** fix websocket-related types on AppiumServer ([34891f5](https://github.com/appium/appium/commit/34891f56572f18dd740558b2348d8818680dc709))
* **base-driver:** fix timeout mixin to use proper context types ([51a8f2f](https://github.com/appium/appium/commit/51a8f2fc347f0b4e222ca2e8dc92fa4bdf44d1e3))
* **base-driver:** misc type fixes ([d303527](https://github.com/appium/appium/commit/d303527c3da4f657a28b97a2d82eb1a709c6b9bc))
* **basedriver:** convert main driver implementation to typescript ([deb631b](https://github.com/appium/appium/commit/deb631b4562a0f99e4061c89a7ad21b0621f8a47)), closes [#18379](https://github.com/appium/appium/issues/18379) [#18379](https://github.com/appium/appium/issues/18379)
* **types:** update dependency type-fest to v3.7.0 ([6912fa1](https://github.com/appium/appium/commit/6912fa14f2a7d338f17e1bed060e959de7aba1d6))
* **types:** update dependency type-fest to v3.7.1 ([bc860c7](https://github.com/appium/appium/commit/bc860c733a73760f0c42cbfb384e04d50c376d5e))





## [9.3.3](https://github.com/appium/appium/compare/@appium/base-driver@9.3.2...@appium/base-driver@9.3.3) (2023-03-08)


### Bug Fixes

* **base-driver:** remove needless static prop breaking the build ([1b70551](https://github.com/appium/appium/commit/1b70551055444cad97144e539da7be872b9f70f8))
* **base-driver:** use new mixin strategy ([be86627](https://github.com/appium/appium/commit/be8662759586bb3c24c7635b60ed8c574f5e2fd4))
* **images-plugin:** update dependency lru-cache to v7.17.2 ([d1d5ece](https://github.com/appium/appium/commit/d1d5ecef87e70afea6d9d59f69cae465460e930b))
* **images-plugin:** update dependency lru-cache to v7.18.1 ([ed1d3aa](https://github.com/appium/appium/commit/ed1d3aae61539bc136b3f266911331387397b88a))
* **images-plugin:** update dependency lru-cache to v7.18.2 ([48c3311](https://github.com/appium/appium/commit/48c331157f74b238a3fc8dc92775d0af3f9f3134))
* **images-plugin:** update dependency lru-cache to v7.18.3 ([01bff49](https://github.com/appium/appium/commit/01bff49297ca5a1c92259f1f8f11f5944ef15e4d))
* **types:** update dependency type-fest to v3.6.1 ([471a4b5](https://github.com/appium/appium/commit/471a4b57e622ff077d59f577a78341268700c48d))





## [9.3.2](https://github.com/appium/appium/compare/@appium/base-driver@9.3.1...@appium/base-driver@9.3.2) (2023-02-24)


### Bug Fixes

* appium:options should work via --default-capabilities ([11e7ad0](https://github.com/appium/appium/commit/11e7ad0cd403ab1dc100f581cdf93772e3449db3)), closes [#18191](https://github.com/appium/appium/issues/18191)
* **base-driver:** fix type problem w/r/t axios headers ([61a0275](https://github.com/appium/appium/commit/61a0275e29e7a705785282415fd670a3ad617f18))
* **base-driver:** update dependency body-parser to v1.20.2 ([1cb01a5](https://github.com/appium/appium/commit/1cb01a5e85e7aee54ce1edc751e104138852d59a))
* **images-plugin:** update dependency lru-cache to v7.15.0 ([4cf8dbc](https://github.com/appium/appium/commit/4cf8dbc0d34769e3167bceed65facabe71b9cbde))
* **images-plugin:** update dependency lru-cache to v7.16.0 ([d54901a](https://github.com/appium/appium/commit/d54901a9c3982dd5595ffd54010e5029b60c4754))
* **images-plugin:** update dependency lru-cache to v7.16.1 ([2fa6bf1](https://github.com/appium/appium/commit/2fa6bf1e11e66ba8256d0641e345359bd108bc7d))
* **images-plugin:** update dependency lru-cache to v7.16.2 ([4b10322](https://github.com/appium/appium/commit/4b10322b80e0032dd4585ac7766edd1ddf798139))
* **images-plugin:** update dependency lru-cache to v7.17.0 ([eb73be8](https://github.com/appium/appium/commit/eb73be8303c517dbaa965ae99bac3381522d939a))
* **support:** update dependency axios to v1.3.4 ([49f157d](https://github.com/appium/appium/commit/49f157d63e3bdbd205527a5dc8f997df68540546))
* **types:** update dependency type-fest to v3.5.7 ([b4416c5](https://github.com/appium/appium/commit/b4416c5c0f40200b36909a1fbb492d8c4a212108))
* **types:** update dependency type-fest to v3.6.0 ([08a6f3a](https://github.com/appium/appium/commit/08a6f3a308c7ee162e992629888557b31e50a26e))
* update axios to v1.3.3 ([8f9de63](https://github.com/appium/appium/commit/8f9de63e4a622712db545ab63f9f4ce6654e4a91))





## [9.3.1](https://github.com/appium/appium/compare/@appium/base-driver@9.3.0...@appium/base-driver@9.3.1) (2023-02-09)


### Bug Fixes

* **base-driver,driver-test-support,support:** update types for axios@1.2.3 ([c5451e4](https://github.com/appium/appium/commit/c5451e4d8280483dabca6e0bc62736689406d3df))
* **base-driver:** update definitelytyped ([c2289ad](https://github.com/appium/appium/commit/c2289ad607e1af0aa1182a5b5ab707c5dbf12922))
* **support:** update dependency axios to v1.2.3 ([20c176b](https://github.com/appium/appium/commit/20c176bae7d0a4f928082fe1a9237f995b8bd58e))
* **types:** update definitelytyped ([172bdae](https://github.com/appium/appium/commit/172bdae436efa75c5928972322d260184c225dd6))
* **types:** update dependency @types/express to v4.17.16 ([644f300](https://github.com/appium/appium/commit/644f300cd87edbf3788eb82c4c88f6b773e653b0))
* **types:** update dependency type-fest to v3.5.4 ([cfb5297](https://github.com/appium/appium/commit/cfb529772cff3a2b7e9ff36e12444b603906a769))
* **types:** update dependency type-fest to v3.5.5 ([9bf320c](https://github.com/appium/appium/commit/9bf320c87ccf574f933a8247a851b4f848c39fa1))
* **types:** update dependency type-fest to v3.5.6 ([775c990](https://github.com/appium/appium/commit/775c990f9d4176e78936a071968a788e19048519))





# [9.3.0](https://github.com/appium/appium/compare/@appium/base-driver@9.2.3...@appium/base-driver@9.3.0) (2023-01-23)


### Bug Fixes

* **types:** update dependency type-fest to v3.5.2 ([64fd8ce](https://github.com/appium/appium/commit/64fd8ce94018b0bb7ccb2baade8d525703f41c45))
* **types:** update dependency type-fest to v3.5.3 ([6c4ba8c](https://github.com/appium/appium/commit/6c4ba8caa508840640f05eea1ab41ecb290312aa))


### Features

* **base-plugin:** add ability for plugins to implement execute methods ([84abed9](https://github.com/appium/appium/commit/84abed920a1dc796ff09013ce86079de5a25fe50))





## [9.2.3](https://github.com/appium/appium/compare/@appium/base-driver@9.2.2...@appium/base-driver@9.2.3) (2023-01-13)

**Note:** Version bump only for package @appium/base-driver





## [9.2.2](https://github.com/appium/appium/compare/@appium/base-driver@9.2.1...@appium/base-driver@9.2.2) (2023-01-13)

**Note:** Version bump only for package @appium/base-driver





## [9.2.1](https://github.com/appium/appium/compare/@appium/base-driver@9.2.0...@appium/base-driver@9.2.1) (2023-01-13)

**Note:** Version bump only for package @appium/base-driver





# [9.2.0](https://github.com/appium/appium/compare/@appium/base-driver@9.1.0...@appium/base-driver@9.2.0) (2023-01-13)


### Bug Fixes

* **appium:** inability to find automationName inside appium:options ([#17966](https://github.com/appium/appium/issues/17966)) ([23224cf](https://github.com/appium/appium/commit/23224cf002b7dd9e4e5d8426b4bbe1cb28f62605))
* **base-driver:** add missing dependency @appium/types ([edde488](https://github.com/appium/appium/commit/edde4882f0633c032a077861599c337132092daf)), closes [#18006](https://github.com/appium/appium/issues/18006)
* **base-driver:** move setClipboard deprecation to correct place ([ad1dce5](https://github.com/appium/appium/commit/ad1dce5545acb61ce79e489783a95f2caebd753c))
* **support:** update dependency axios to v1.2.2 ([5291ca6](https://github.com/appium/appium/commit/5291ca672b3b47c5270e9fd85de3e4ed76a650e0))
* **types:** update dependency type-fest to v3.5.0 ([8c8bfe8](https://github.com/appium/appium/commit/8c8bfe824dbe062e24cfe9fc6e1afa2f68cc6e4c))
* **types:** update dependency type-fest to v3.5.1 ([4b5ab4d](https://github.com/appium/appium/commit/4b5ab4da7be925d0592c18e8f46a9ce30fbddf8e))


### Features

* **base-driver:** deprecate non-standard routes ([7055a0b](https://github.com/appium/appium/commit/7055a0b28193f677b21541ddada3c4a314f90f5b))
* **typedoc-appium-plugin:** implement cross-referencing of methods ([8b33414](https://github.com/appium/appium/commit/8b334149018f7d49448da9e7982356c72bcd468e))





# [9.1.0](https://github.com/appium/appium/compare/@appium/base-driver@9.0.0...@appium/base-driver@9.1.0) (2022-12-21)

### Bug Fixes

- add 'webSocketUrl' as standard cap for bidi support ([#17936](https://github.com/appium/appium/issues/17936)) ([0e195ca](https://github.com/appium/appium/commit/0e195caafefe911586ee2f8be4ae33d402b2ba40))
- **types:** update definitelytyped ([172fcb9](https://github.com/appium/appium/commit/172fcb9aff0afe5295650566c4fb92d0894bf879))
- **types:** update dependency type-fest to v3.4.0 ([37f71c3](https://github.com/appium/appium/commit/37f71c327a7c1a6d882b5198af6fedc9e8d51496))

### Features

- **base:** add get computed role and label in W3C v2 ([#17928](https://github.com/appium/appium/issues/17928)) ([316ecca](https://github.com/appium/appium/commit/316ecca8b1f8e52806867a15ba8524a504751460))

# [9.0.0](https://github.com/appium/appium/compare/@appium/base-driver@8.7.3...@appium/base-driver@9.0.0) (2022-12-14)

### Bug Fixes

- **base-driver:** ensure caps is defined ([1e00faf](https://github.com/appium/appium/commit/1e00faf1a4cf4b72cbb23997fa895e1fb48a06ce))
- **base-driver:** Properly validate capabilities inside appium:options map ([#17781](https://github.com/appium/appium/issues/17781)) ([9190115](https://github.com/appium/appium/commit/91901153a12a5d1e589e15f4ec2415a125ddc159))
- **base-driver:** update type for logExtraCaps ([28876c1](https://github.com/appium/appium/commit/28876c19f3544ca4dc4efb7c5ed48b9c72fab7fa))
- **basedriver,types:** fix type problems ([226cd01](https://github.com/appium/appium/commit/226cd018b408ba93f737b7ae58646c2ba2375eb1))
- **fake-driver:** update dependency asyncbox to v2.9.4 ([70a9c14](https://github.com/appium/appium/commit/70a9c144fc0bd80c4459223d5c8170a4d541db6c))
- **images-plugin:** update dependency lru-cache to v7.14.1 ([0d7c936](https://github.com/appium/appium/commit/0d7c936b11499deb482fc41b0c760d56ad30e1fb))
- **opencv:** update definitelytyped ([32557f4](https://github.com/appium/appium/commit/32557f4bca5acc2f89cfd3a70f369cebeb94c588))
- **support:** update dependency axios to v1.2.0 ([b80b88b](https://github.com/appium/appium/commit/b80b88bd9cf2d6325ea6104449170b8339bf23e0))
- **support:** update dependency axios to v1.2.1 ([07d6ef6](https://github.com/appium/appium/commit/07d6ef6b8cc1608da8860f601a80ec0f6a7a7598))
- **types:** update dependency type-fest to v3.2.0 ([f5da9f3](https://github.com/appium/appium/commit/f5da9f31a31b62d32b076857891cb027887fdbaf))
- **types:** update dependency type-fest to v3.3.0 ([33aef07](https://github.com/appium/appium/commit/33aef07d245627e67823a3b344cdf612e4452551))

- chore!: set engines to minimum Node.js v14.17.0 ([a1dbe6c](https://github.com/appium/appium/commit/a1dbe6c43efe76604943a607d402f4c8b864d652))

### Features

- experimental support for typedoc generation ([4746080](https://github.com/appium/appium/commit/4746080e54ed8bb494cbc7c6ce83db503bf6bb52))

### BREAKING CHANGES

- Appium now supports version range `^14.17.0 || ^16.13.0 || >=18.0.0`

## [8.7.3](https://github.com/appium/appium/compare/@appium/base-driver@8.7.2...@appium/base-driver@8.7.3) (2022-10-14)

### Bug Fixes

- **basedriver:** ensure "opts" is defined at time of construction ([51d6d69](https://github.com/appium/appium/commit/51d6d69ff13a0cc23d612257926c02892685dcee))

## [8.7.2](https://github.com/appium/appium/compare/@appium/base-driver@8.7.1...@appium/base-driver@8.7.2) (2022-10-13)

**Note:** Version bump only for package @appium/base-driver

## [8.7.1](https://github.com/appium/appium/compare/@appium/base-driver@8.7.0...@appium/base-driver@8.7.1) (2022-09-07)

**Note:** Version bump only for package @appium/base-driver

# [8.7.0](https://github.com/appium/appium/compare/@appium/base-driver@8.6.1...@appium/base-driver@8.7.0) (2022-08-10)

### Features

- **appium,base-driver,fake-driver,fake-plugin,test-support,types:** updateServer receives cliArgs param ([d4b9833](https://github.com/appium/appium/commit/d4b983328af21d1e5c27a91e438e7934eb152ab1)), closes [#17304](https://github.com/appium/appium/issues/17304)
- **base-driver,fake-driver,appium:** add convenience methods for defining execute script overloads ([#17321](https://github.com/appium/appium/issues/17321)) ([337ec3e](https://github.com/appium/appium/commit/337ec3e7ba216dd6f8cdc88143ecaa4c75f5d266))

## [8.6.1](https://github.com/appium/appium/compare/@appium/base-driver@8.6.0...@appium/base-driver@8.6.1) (2022-08-03)

### Bug Fixes

- **appium,base-driver,base-plugin,doctor,docutils,eslint-config-appium,execute-driver-plugin,fake-driver,fake-plugin,gulp-plugins,images-plugin,opencv,relaxed-caps-plugin,schema,support,test-support,types,universal-xml-plugin:** update engines ([d8d2382](https://github.com/appium/appium/commit/d8d2382327ba7b7db8a4d1cad987c0e60184c92d))

# [8.6.0](https://github.com/appium/appium/compare/@appium/base-driver@8.5.7...@appium/base-driver@8.6.0) (2022-07-28)

### Bug Fixes

- moved type packages to deps of specific packages ([f9129df](https://github.com/appium/appium/commit/f9129dfee32fcc3f89ffcfa69fb83b7c2419c24f))

### Features

- **appium,base-driver,base-plugin,test-support,types:** move test fixtures into test-support ([70d88cb](https://github.com/appium/appium/commit/70d88cb86f28354efe313cc6be6a0afef20b38b3))

## [8.5.7](https://github.com/appium/appium/compare/@appium/base-driver@8.5.6...@appium/base-driver@8.5.7) (2022-06-04)

**Note:** Version bump only for package @appium/base-driver

## [8.5.6](https://github.com/appium/appium/compare/@appium/base-driver@8.5.5...@appium/base-driver@8.5.6) (2022-06-03)

### Bug Fixes

- **base-driver:** don't assign log to jwproxy from opts ([eae3efd](https://github.com/appium/appium/commit/eae3efd1d7d2bd515e8e2844e1e16324a91ae47d))

## [8.5.5](https://github.com/appium/appium/compare/@appium/base-driver@8.5.4...@appium/base-driver@8.5.5) (2022-05-31)

**Note:** Version bump only for package @appium/base-driver

## [8.5.4](https://github.com/appium/appium/compare/@appium/base-driver@8.5.3...@appium/base-driver@8.5.4) (2022-05-31)

### Bug Fixes

- **appium:** fix extension autoinstall postinstall script ([3e2c05d](https://github.com/appium/appium/commit/3e2c05d8a290072484afde34fe5fd968618f6359)), closes [#16924](https://github.com/appium/appium/issues/16924)

## [8.5.3](https://github.com/appium/appium/compare/@appium/base-driver@8.5.2...@appium/base-driver@8.5.3) (2022-05-02)

**Note:** Version bump only for package @appium/base-driver

## [8.5.2](https://github.com/appium/appium/compare/@appium/base-driver@8.5.1...@appium/base-driver@8.5.2) (2022-04-20)

**Note:** Version bump only for package @appium/base-driver

## [8.5.1](https://github.com/appium/appium/compare/@appium/base-driver@8.5.0...@appium/base-driver@8.5.1) (2022-04-20)

**Note:** Version bump only for package @appium/base-driver

# [8.5.0](https://github.com/appium/appium/compare/@appium/base-driver@8.4.2...@appium/base-driver@8.5.0) (2022-04-20)

### Bug Fixes

- **base-driver:** do not throw if updateSettings aren't provided ([2d76923](https://github.com/appium/appium/commit/2d76923e7232592f32c30731f2879a16b3e27b17))
- **base-driver:** supportedLogTypes does not get overwritten ([ab6dfb3](https://github.com/appium/appium/commit/ab6dfb3158e192b42313d6b1d8648ffc672af8bd)), closes [#16738](https://github.com/appium/appium/issues/16738)

### Features

- **base-driver:** Add a route for new window creation ([#16748](https://github.com/appium/appium/issues/16748)) ([78a4637](https://github.com/appium/appium/commit/78a46375aed016feb6e2b20299cc834d2d24e1cb))

## [8.4.2](https://github.com/appium/appium/compare/@appium/base-driver@8.4.1...@appium/base-driver@8.4.2) (2022-04-12)

**Note:** Version bump only for package @appium/base-driver

## [8.4.1](https://github.com/appium/appium/compare/@appium/base-driver@8.4.0...@appium/base-driver@8.4.1) (2022-04-12)

### Bug Fixes

- **base-driver:** isErrorType import ([ad3b4b2](https://github.com/appium/appium/commit/ad3b4b2c9676623a5eeb92e0beb510ec181fbcf8))
- **base-driver:** Make sure proxyReqRes helper never throws any exceptions ([#16742](https://github.com/appium/appium/issues/16742)) ([5d2156a](https://github.com/appium/appium/commit/5d2156a06bcf621116db0adbedce431d7c18fca7))

# [8.4.0](https://github.com/appium/appium/compare/@appium/base-driver@8.3.1...@appium/base-driver@8.4.0) (2022-04-07)

### Bug Fixes

- **base-driver:** Make sure we never mutate incoming args ([#16670](https://github.com/appium/appium/issues/16670)) ([c63e9bf](https://github.com/appium/appium/commit/c63e9bf8e0f42e6e070ca662d0b6079a5e7284e2))
- **base-driver:** Update/simplify the logic for logger prefix ([#16683](https://github.com/appium/appium/issues/16683)) ([a9651d3](https://github.com/appium/appium/commit/a9651d3c59caf0b1be1b85b5185192578925f3ac))

### Features

- **base-driver:** Add more shadow root-related W3C routes ([#16700](https://github.com/appium/appium/issues/16700)) ([d8a9b4d](https://github.com/appium/appium/commit/d8a9b4da362c0ee3d1616595a9f652a59b178065))
- **base-driver:** generate declaration files ([164bedb](https://github.com/appium/appium/commit/164bedb2f13e0c3ab7d27644107bc2320bb02db9))

## [8.3.1](https://github.com/appium/appium/compare/@appium/base-driver@8.3.0...@appium/base-driver@8.3.1) (2022-03-23)

### Bug Fixes

- **base-driver:** Use WeakRef to reference the driver instance in the log prefix generator ([#16636](https://github.com/appium/appium/issues/16636)) ([bbfc7ef](https://github.com/appium/appium/commit/bbfc7ef51d8a5c7e99072ee599ce2a6265017ea4))

# [8.3.0](https://github.com/appium/appium/compare/@appium/base-driver@8.2.4...@appium/base-driver@8.3.0) (2022-03-22)

### Bug Fixes

- remove BASEDRIVER_HANDLED_SETTINGS ([#16368](https://github.com/appium/appium/issues/16368)) ([5aae1ae](https://github.com/appium/appium/commit/5aae1ae8a70495f4b2ff230b0881acb5b7b59d76))
- revert 15809 ([#16621](https://github.com/appium/appium/issues/16621)) ([3ee93ba](https://github.com/appium/appium/commit/3ee93ba5bd44268692bee5853b39f6b7ce593d7e))
- Update property name after lru-cache package bump ([#16446](https://github.com/appium/appium/issues/16446)) ([1165269](https://github.com/appium/appium/commit/1165269644f8151b31730e920d9576c05e8072f4))

### Features

- Add a missing route for element shadow root ([#16538](https://github.com/appium/appium/issues/16538)) ([493c48d](https://github.com/appium/appium/commit/493c48d190373e188f5a8a3c416ebddc6a17189b))
- **base-driver:** Add the size validation of the passed settings objects ([#16420](https://github.com/appium/appium/issues/16420)) ([a881ae9](https://github.com/appium/appium/commit/a881ae992abfddcdb9fd27d699ce8b824847ed47))

## [8.2.4](https://github.com/appium/appium/compare/@appium/base-driver@8.2.3...@appium/base-driver@8.2.4) (2022-01-21)

**Note:** Version bump only for package @appium/base-driver

## [8.2.3](https://github.com/appium/appium/compare/@appium/base-driver@8.2.2...@appium/base-driver@8.2.3) (2022-01-11)

### Bug Fixes

- **appium:** fix incorrect handling of delete session with regard to plugin driver assignment ([7b3893a](https://github.com/appium/appium/commit/7b3893a36202018de7c2124c2028bfbbd8a9d7fd))
- **base-driver:** follow W3C capabilities more strictly ([#16193](https://github.com/appium/appium/issues/16193)) ([9a85a41](https://github.com/appium/appium/commit/9a85a41b9e134949ed5743ccdcf6bd83ee11df14))
- Switch colors package to a non-compomised repository ([#16317](https://github.com/appium/appium/issues/16317)) ([40a6f05](https://github.com/appium/appium/commit/40a6f054dca3d94fc88773af9c6336ba12ebfb81))

## [8.2.2](https://github.com/appium/appium/compare/@appium/base-driver@8.2.1...@appium/base-driver@8.2.2) (2021-11-23)

**Note:** Version bump only for package @appium/base-driver

## [8.2.1](https://github.com/appium/appium/compare/@appium/base-driver@8.2.0...@appium/base-driver@8.2.1) (2021-11-19)

### Bug Fixes

- **base-driver:** create cjs wrapper ([85cd55b](https://github.com/appium/appium/commit/85cd55bc2c54e2091dec69ead1462c5f022e590b))

# [8.2.0](https://github.com/appium/appium/compare/@appium/base-driver@8.1.2...@appium/base-driver@8.2.0) (2021-11-15)

### Bug Fixes

- **appium:** fix interaction of plugins with proxying ([7091008](https://github.com/appium/appium/commit/70910087d11100fe47627754ade379a2d3a7ff5d))

### Features

- **fake-driver:** add a new 'PROXY' context that does 'proxying' for use in testing ([9e6c0a1](https://github.com/appium/appium/commit/9e6c0a13ef197c3a8caa9e18bdf4f8e6960951f1))

## [8.1.2](https://github.com/appium/appium/compare/@appium/base-driver@8.1.1...@appium/base-driver@8.1.2) (2021-11-09)

### Bug Fixes

- **base-driver:** allow https in helper URL generation ([cf86871](https://github.com/appium/appium/commit/cf86871d4f5d3cf7f9865dd2409bd306a5dd920a))
- **base-driver:** better URL handling in driver-e2e tests ([01d7c1b](https://github.com/appium/appium/commit/01d7c1bd7ebfa9a54b22d04f81c24ee95bec0962))
- **base-driver:** type inconsistency ([#15982](https://github.com/appium/appium/issues/15982)) ([0e63393](https://github.com/appium/appium/commit/0e633939f9b6451899ce963391eaeb9e44bbba5d))

## [8.1.1](https://github.com/appium/appium/compare/@appium/base-driver@8.1.0...@appium/base-driver@8.1.1) (2021-09-16)

**Note:** Version bump only for package @appium/base-driver

# [8.1.0](https://github.com/appium/appium/compare/@appium/base-driver@8.0.3...@appium/base-driver@8.1.0) (2021-09-16)

### Features

- **base-driver:** allow drivers, and plugins to declare that certain routes must never be proxied ([3e5aec9](https://github.com/appium/appium/commit/3e5aec945bc0493dbd14d0759e5e35749e974aac))

## [8.0.3](https://github.com/appium/appium/compare/@appium/base-driver@8.0.2...@appium/base-driver@8.0.3) (2021-09-15)

**Note:** Version bump only for package @appium/base-driver

## [8.0.2](https://github.com/appium/appium/compare/@appium/base-driver@8.0.1...@appium/base-driver@8.0.2) (2021-09-14)

**Note:** Version bump only for package @appium/base-driver

## [8.0.1](https://github.com/appium/appium/compare/@appium/base-driver@8.0.0...@appium/base-driver@8.0.1) (2021-09-14)

**Note:** Version bump only for package @appium/base-driver

# [8.0.0-beta.7](https://github.com/appium/appium/compare/@appium/base-driver@8.0.0-beta.7...@appium/base-driver@8.0.0-beta.7) (2021-08-16)

# 2.0.0-beta (2021-08-13)

### chore

- update @appium/fake-driver to use @appium/base-driver ([#15436](https://github.com/appium/appium/issues/15436)) ([c66144d](https://github.com/appium/appium/commit/c66144d62b23681f91b45c45648dddf51f0ea991)), closes [#15425](https://github.com/appium/appium/issues/15425)

### Features

- **appium:** Add driver and plugin server arg injection feature ([#15388](https://github.com/appium/appium/issues/15388)) ([d3c11e3](https://github.com/appium/appium/commit/d3c11e364dffff87ac38ac8dc3ad65a1e4534a9a))
- **appium:** expose validateCaps in basedriver index ([#15451](https://github.com/appium/appium/issues/15451)) ([21e8d60](https://github.com/appium/appium/commit/21e8d60a5c768762ebaa7a3232962b0dec385bd0))
- **base-driver:** prefer system unzip ([25cc27d](https://github.com/appium/appium/commit/25cc27d161e9425a2ce7420d4417f85d03984921))

### Reverts

- **base-driver:** "chore: merge base-driver master (de7e41b) to base-driver for 2.0" ([#15454](https://github.com/appium/appium/issues/15454)) ([254cc63](https://github.com/appium/appium/commit/254cc638c52063149878866c2abdfe83c5dbee7b))

### BREAKING CHANGES

- `fake-driver` now depends upon `@appium/base-driver@8.x`

## `@appium/fake-driver`

- need to use w3c capabilities only
- fix: find `app.xml` fixture properly when running tests via `mocha --require=@babel/register`

## `@appium/base-driver`

- fixed a dead URL in a comment
- updated the "logging" tests to manually supply w3c capabilities. `createSession()` does it for you, but `executeCommand('createSession')` does not.
- display the name of the driver under test when executing base driver's test suite with other drivers
