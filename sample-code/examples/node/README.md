#Node.js samples

## prerequisites

Upgrade Mocha to the latest version before running the tests.

##iOS

### local

```
./reset.sh --hardcore --ios

mocha sample-code/examples/node/ios-simple.js
mocha sample-code/examples/node/ios-complex.js
mocha sample-code/examples/node/ios-webview.js
mocha sample-code/examples/node/ios-actions.js
mocha sample-code/examples/node/ios-local-server.js
mocha sample-code/examples/node/ios-selenium-webdriver-bridge.js
```
### dev (run against locally built app)

```
./reset.sh --hardcore --ios --dev

DEV=1 mocha sample-code/examples/node/ios-simple.js
DEV=1 mocha sample-code/examples/node/ios-complex.js
DEV=1 mocha sample-code/examples/node/ios-webview.js
DEV=1 mocha sample-code/examples/node/ios-actions.js
DEV=1 mocha sample-code/examples/node/ios-local-server.js
DEV=1 mocha sample-code/examples/node/ios-selenium-webdriver-bridge.js
```

### Sauce Labs

```
./reset.sh --hardcore --ios
export SAUCE_USERNAME=<SAUCE_USERNAME>
export SAUCE_ACCESS_KEY=<SAUCE_ACCESS_KEY>

SAUCE=1 mocha sample-code/examples/node/ios-simple.js
SAUCE=1 mocha sample-code/examples/node/ios-complex.js
SAUCE=1 mocha sample-code/examples/node/ios-webview.js
SAUCE=1 mocha sample-code/examples/node/ios-actions.js
SAUCE=1 mocha sample-code/examples/node/ios-selenium-webdriver-bridge.js
```

### Sauce Labs + Sauce Connect

Install and start Sauce Connect (see [doc here](https://saucelabs.com/docs/connect))

```
./reset.sh --hardcore --ios
export SAUCE_USERNAME=<SAUCE_USERNAME>
export SAUCE_ACCESS_KEY=<SAUCE_ACCESS_KEY>

SAUCE=1 mocha sample-code/examples/node/ios-local-server.js
```

##Android

### local

```
./reset.sh --hardcore --android

mocha sample-code/examples/node/android-simple.js
mocha sample-code/examples/node/android-complex.js
mocha sample-code/examples/node/android-webview.js
mocha sample-code/examples/node/android-local-server.js
```

### dev (run against locally built app)

```
./reset.sh --hardcore --android --dev

DEV=1 mocha sample-code/examples/node/android-simple.js
DEV=1 mocha sample-code/examples/node/android-complex.js
DEV=1 mocha sample-code/examples/node/android-webview.js
DEV=1 mocha sample-code/examples/node/android-local-server.js
```

### Sauce Labs

```
./reset.sh --hardcore --android
export SAUCE_USERNAME=<SAUCE_USERNAME>
export SAUCE_ACCESS_KEY=<SAUCE_ACCESS_KEY>

SAUCE=1 mocha sample-code/examples/node/android-simple.js
SAUCE=1 mocha sample-code/examples/node/android-complex.js
SAUCE=1 mocha sample-code/examples/node/android-webview.js
```

### Sauce Labs + Sauce Connect

Install and start Sauce Connect (see [doc here](https://saucelabs.com/docs/connect))

```
./reset.sh --hardcore --android
export SAUCE_USERNAME=<SAUCE_USERNAME>
export SAUCE_ACCESS_KEY=<SAUCE_ACCESS_KEY>

SAUCE=1 mocha sample-code/examples/node/android-local-server.js
```

##Selendroid

### local

```
./reset.sh --hardcore --android --selendroid

mocha sample-code/examples/node/selendroid-simple.js
```

### Sauce Labs

```
./reset.sh --hardcore --android --selendroid

SAUCE=1 mocha sample-code/examples/node/selendroid-simple.js
```

##Node.js 0.11 + Generator with Yiewd

### local

switch to node > 0.11

```
./reset.sh --hardcore --ios

mocha --harmony sample-code/examples/node/ios-yiewd.js
```

### Sauce Labs

switch to node > 0.11

```
./reset.sh --hardcore --ios
export SAUCE_USERNAME=<SAUCE_USERNAME>
export SAUCE_ACCESS_KEY=<SAUCE_ACCESS_KEY>

SAUCE=1 mocha --harmony sample-code/examples/node/ios-yiewd.js
```

