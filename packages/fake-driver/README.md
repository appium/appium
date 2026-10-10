# @appium/fake-driver

> Fake Appium driver for internal testing

## Command timeout example

[`getWindowHandleWithPostProcessing`](./lib/driver.ts) demonstrates a custom entry point called
directly from JavaScript, outside Appium's command dispatcher. It uses `runWithCommandTimeout`
from `appium/driver.js` to protect both `executeCommand('getWindowHandle')` and the asynchronous
callback that follows it. The session's idle timer resumes after the whole operation finishes,
including when the callback throws.

```ts
const handle = await driver.getWindowHandleWithPostProcessing(async (handle) => {
  await saveHandle(handle); // Application-specific asynchronous work
});
```

Normal commands using `BaseDriver.executeCommand` need no additional wrapper. The helper tracks
activity; it does not create a command queue or make arbitrary custom timers respect that activity.
This example keeps the standard `BaseDriver.startNewCommandTimeout` implementation.

See [the unit tests](./test/unit/command-timeout.spec.ts) for success, failure, overlapping commands,
and idle expiry after completion. Run them with `npm run test:unit -w @appium/fake-driver` after
building the repository.

## License

Apache-2.0
