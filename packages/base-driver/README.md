# @appium/base-driver

> Base class for creating other Appium drivers

[![NPM version](https://img.shields.io/npm/v/@appium/base-driver.svg)](https://npmjs.org/package/@appium/base-driver)
[![Downloads](https://img.shields.io/npm/dm/@appium/base-driver.svg)](https://npmjs.org/package/@appium/base-driver)

This is the parent class that all Appium drivers inherit from. This driver should not be installed
directly as it does nothing on its own. Instead, you should extend this driver when creating your
*own* Appium drivers. Check out the [Building Drivers](https://appium.io/docs/en/latest/developing/build-drivers/)
documentation for more details.

## License

Apache-2.0

## Testing capability validation without a session

Driver authors can import `diagnoseCaps` from `@appium/base-driver` to assert both
validation errors and previously log-only unknown capability names without
starting Appium, creating a driver session, or capturing warning logs.

```ts
import {diagnoseCaps} from '@appium/base-driver';

const result = diagnoseCaps(
  {deviceName: 'Pixel', deviceNmae: 'typo'} as any,
  {deviceName: {isString: true}},
);
// result.valid === true: unknown keys are still permissible
// result.errors === []
// result.unknownCapabilities === [{name: 'deviceNmae', suggestion: 'deviceName'}]
```

Supply the same combined standard/base/driver constraints used by the driver,
and pass capability keys **after** vendor-prefix normalization. The helper uses
`validateCaps` internally, so its `valid` and `errors` correspond to existing
validation behavior. Unknown entries are advisory and are not validation
failures. Normal session handling and logging are unchanged.
