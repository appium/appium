---
hide:
  - toc

title: API Endpoints
---

Here you can find various API endpoints exposed by the main Appium module through its base driver,
as well as the endpoints added or modified by official plugins.

Since all Appium drivers inherit the Appium base driver, they support all of its endpoints as well,
but may additionally define endpoints of their own. Refer to the documentation of your
[Appium driver](../../ecosystem/drivers.md) to learn about its specific endpoints.

The recommended way of calling these API endpoints is through your [Appium client](../../ecosystem/clients.md).
Refer to the documentation of your client for the exact commands used to invoke specific endpoints.

All endpoint listings are grouped by their protocol, with an additional group for plugin endpoints:

- [WebDriver Protocol](./webdriver.md)
- [WebDriver BiDi Protocol](./bidi.md)
- [JSON Wire Protocol](./jsonwp.md)
- [Appium Protocol](./appium.md)
- [Other Protocols](./others.md)
- [Endpoints Used by Official Plugins](./plugins.md)
