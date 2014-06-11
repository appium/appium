#Appium DotNet samples

## Run locally

### Download apps (default)

- Start Appium.
- Run the tests in NUnit.

### Use Appium dev apps 

- Build dev version of appium `./reset.sh --android --ios --dev --hardcore`
- `cp AppiumDotNetSample/env.json.sample AppiumDotNetSample/env.json`
- Update `AppiumDotNetSample/env.json` set DEV=true
- Start appium: `node .`
- Run the tests in NUnit.

## Run on Sauce Labs

- `cp AppiumDotNetSample/env.json.sample AppiumDotNetSample/env.json`
- Update `AppiumDotNetSample/env.json` set SAUCE=true, and configure your Sauce credentials.
- Run the tests in NUnit.
