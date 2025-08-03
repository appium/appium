---
title: Building Doctor Checks
---

The idea of Appium Doctor is to assist users with driver or plugin preconditions setup. Sometimes such
preconditions might be quite complicated and require non-trivial technical knowledge. Doctor checks,
which are vanilla Node.js class instances written by extension authors, simplify
the setup process by automating diagnostics and possible fixes for the found issues. These checks
might also be interactive to ensure better usage experience.

This tutorial is supposed to be used by plugin or driver authors that would like to help their users
to deal with complicated setup or configuration steps.

## Adding Doctor Checks

### Typing Requirements

The term `Doctor Check` literally describes a single javascript class instance that implements the
[IDoctorCheck interface](https://github.com/appium/appium/blob/master/packages/types/lib/doctor.ts).
The interface defines the following methods and properties:

- `diagnose(): Promise<DoctorCheckResult>`: Contains the code to diagnose a possible issue
- `fix(): Promise<string|null>`: Either fixes the actual problem if `hasAutofix()` returns true or
  returns a string description for possible manual fixes. If this method throws an exception named
  `FixSkippedError` and `hasAutofix()` returns true then the result of the method invocation
  is going to be ignored.
- `hasAutofix(): boolean`: Whether calling `fix()` would resolve the found issue
- `isOptional(): boolean`: Whether the found issue can be ignored and is not a showstopper
- `log: AppiumLogger`: May be used for logging. This property may be assigned
  by the instance itself or by the Appium server if it is left unassigned.

The `DoctorCheckResult` object returned by the `diagnose()` method must contain the following properties:

- `ok: boolean`: Whether the diagnosis found no issues
- `optional: boolean`: Whether the diagnosed issue is safe to ignore
- `message: string`: The text message describing the diagnostic result

### Manifest Requirements

A single extension may export multiple Doctor checks to Appium. In order for these checks to be properly
picked up by the server CLI after the corresponding extension is installed they might be listed in the
package .json manifest under the `appium.doctor.checks` section similar to the definition below:

```json
  // ...
  "appium": {
    "driverName": "fake",
    "automationName": "Fake",
    "platformNames": [
      "Fake"
    ],
    "mainClass": "FakeDriver",
    "schema": "./build/lib/fake-driver-schema.js",
    "scripts": {
      "fake-error": "./build/lib/scripts/fake-error.js",
      "fake-success": "./build/lib/scripts/fake-success.js",
      "fake-stdin": "./build/lib/scripts/fake-stdin.js"
    },
    "doctor": {
      "checks": [
        "./doctor/fake1.js",
        "./doctor/fake2.js"
        // ...
      ]
    }
  },
  // ...
```

Also, it makes sense to include the [@appium/types](https://www.npmjs.com/package/@appium/types) import
to the package dev dependencies.

### Implementation Example

The below example is a "raw" Node.JS implementation that does not use any transpilation:

```js
const {fs, doctor} = require('@appium/support');

/** @satisfies {import('@appium/types').IDoctorCheck} */
class EnvVarAndPathCheck {
  /**
   * @param {string} varName
   */
  constructor(varName) {
    this.varName = varName;
  }

  async diagnose() {
    const varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return doctor.nok(`${this.varName} environment variable is NOT set!`);
    }

    if (await fs.exists(varValue)) {
      return doctor.ok(`${this.varName} is set to: ${varValue}`);
    }

    return doctor.nok(`${this.varName} is set to '${varValue}' but this is NOT a valid path!`);
  }

  async fix() {
    return (
      `Make sure the environment variable ${this.varName} is properly configured for the Appium server process`
    );
  }

  hasAutofix() {
    return false;
  }

  isOptional() {
    return false;
  }
}

const androidHomeCheck = new EnvVarAndPathCheck('ANDROID_HOME');

module.exports = {androidHomeCheck};

/**
 * @typedef {import('@appium/types').DoctorCheckResult} CheckResult
 */
```

This file could be saved as `doctor/android-home-check.js` and then added to the package.json manifest
as

```json
  // ...
  "appium": {
    // ...
    "doctor": {
      "checks": [
        "./doctor/android-home-check.js",
      ]
    }
    // ...
  },
  // ...
```
