---
authors:
  - sai
  - srini
  - jlipps
date: 2025-08-07
---

# 🚀 Appium 3

Appium 3 is here — and while it's not as massive a leap as Appium 2, it introduces a few essential
breaking changes that developers and QA engineers should be aware of.

<!-- more -->

The main idea behind Appium 3 is to clear out old cruft so that Appium can be leaner moving
forward, and rely on newer versions of software with better performance and security
characteristics. We're also getting rid of legacy behaviors and protocols that we deprecated as
part of Appium 2.

For you as a user, there's not much to worry about. The breaking changes are minimal:

- Node.js / NPM minimum version bump (to 20.19 / 10)
- Removal of certain deprecated endpoints
- Security feature flag prefix requirements (e.g. `adb_shell` to `uiautomator2:adb_shell`)

In terms of new features, we've been adding them incrementally rather than saving them up for
Appium 3. But with this release we are excited to share these new capabilities:

- `appium plugin install inspector` (Use Appium to host the Inspector rather than downloading it as a separate app)
- Clients can set the `X-Appium-Is-Sensitive` HTTP header on requests to direct the server to mask the data in the request in the logs, so that when you send a password into an input box, the password's actual value is not logged in plaintext. ([Learn more](../../developing/sensitive.md))

Of course, we have a full [Appium 3 migration guide](../../guides/migrating-2-to-3.md) to make sure
you know all the details and can deeply understand the consequences of upgrading to Appium 3 in
your environment.

---

**Ready to make the leap?** Appium 3 is a great step forward in creating more secure, maintainable,
and W3C-compliant test automation pipelines. Happy testing!
