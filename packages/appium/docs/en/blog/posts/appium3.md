---
authors:
  - sai
  - srini
date: 2025-07-28
---


# 🚀 Upgrading to Appium 3: What You Need to Know

Appium 3 is here — and while it’s not as massive a leap as Appium 2, it introduces a few essential breaking changes that developers and QA engineers should be aware of. If you’re currently using Appium 2 and planning your upgrade path, this guide will help you understand what’s changed, why it matters, and what actions you need to take.

Let’s dive into what’s new and what you need to prepare for.

---

## ⚙️ Installation

If you have Appium 2 already installed then it would be a good idea to delete it first to avoid possible conflicts:

```bash
appium setup reset
npm uninstall -g appium
```

Use the following commands to install new betas:

```bash
npm install -g appium@beta
appium driver install xcuitest@beta
appium driver install uiautomator2@beta
```

Other drivers have not been checked/updated for compatibility yet.

---

## 🔧 Breaking Changes in Appium 3

### 1. **Node.js 20+ Required**

Appium 3 raises the bar for Node.js support. You’ll need at least:

* **Node.js:** `v20.19.0`
* **npm:** `v10+`

> ⚠️ **Action Needed**
> Upgrade your environment to Node.js v20.19.0 or later, and npm v10 or later.

---

### 2. **Deprecated Endpoints Removed**

Appium 3 removes many legacy server endpoints. In Appium 2, both W3C and JSONWP parameter formats were accepted — Appium 3 now enforces **W3C-only** parameters.

> ⚠️ **Action Needed**
> Update your Appium client calls to use the W3C-compliant formats. Refer to the modified and removed endpoint sections in the official changelog.

---

### 3. **Mandatory Feature Flag Scoping**

In Appium 2, insecure features could be enabled globally. Appium 3 **requires** scoping these features to specific drivers.

**Appium 2:**

```bash
appium --allow-insecure=adb_shell
```

**Appium 3:**

```bash
appium --allow-insecure=uiautomator2:adb_shell
# OR globally:
appium --allow-insecure=*:adb_shell
```

> ⚠️ **Action Needed**
> Add a scope prefix (like `uiautomator2:` or `*:`) for each insecure feature you enable.

---

### 4. **Session Discovery Now Feature-Flagged**

The familiar `GET /sessions` endpoint has been **replaced** with `GET /appium/sessions`, and now requires the `session_discovery` feature flag.

> ⚠️ **Actions Needed**
>
> * Replace `GET /sessions` with `GET /appium/sessions`
> * Add `--allow-insecure=*:session_discovery` to your Appium server startup
> * Upgrade Appium Inspector to **v2025.3.1** or newer to support the new endpoint

---

### 5. **Unzip Logic Delegated to Drivers**

Appium 3 removes centralized unzip logic. This responsibility now lies with individual drivers.

> ⚠️ **Action Needed**
> Make sure you're using **the latest versions** of the drivers (like `uiautomator2`, `xcuitest`, etc.)

---


### 6. **Internal Upgrade to Express 5**

Appium now uses Express 5 under the hood.

> ✅ **No action needed**, unless you’re integrating Appium server components into your own Node.js project.

---

### 7. 🔌 Appium Inspector Usage

After installing the inspector plugin, you can start the Appium server with the inspector enabled using:

```bash
appium server --use-plugin=inspector --allow-cors
```

Then access the inspector UI at:

```
http://localhost:4723/inspector
```

Replace `localhost` and `4723` with the IP address and port where your Appium server is running.

---

## 🔄 Endpoint Overhaul

A comprehensive list of removed and modified endpoints is available in the Appium changelog. Here are a few notable examples:


### 🚫 Removed:

| Old Endpoint                                       | Replacement             |
| -------------------------------------------------- | ----------------------- |
| `GET /sessions`                                    | `GET /appium/sessions`  |
| `POST /session/:sessionId/appium/app/background`   | `mobile: backgroundApp` |
| `POST /session/:sessionId/appium/device/is_locked` | `mobile: isLocked`      |

You’ll also find some endpoints moved to platform-specific drivers — for example, `start_recording_screen` is now implemented per driver like `uiautomator2`, `xcuitest`, and `mac2`.

> For a more comprehensive list of removed endpoints, see the [migration guide](https://github.com/appium/appium/blob/master/packages/appium/docs/en/guides/migrating-2-to-3.md#removed).

### ✏️ Modified:

Some endpoints have had parameters removed:

| Endpoint                              | Removed Params                                | Accepted Params                  |
| ------------------------------------- | --------------------------------------------- | -------------------------------- |
| `POST /session`                       | `desiredCapabilities`, `requiredCapabilities` | `capabilities`                   |
| `POST /session/:sessionId/alert/text` | `value`                                       | `text`                           |
| `POST /session/:sessionId/timeouts`   | `type`, `ms`                                  | `script`, `pageLoad`, `implicit` |

---

## 🧠 Final Thoughts

Appium 3 may be a smaller update compared to Appium 2, but its stricter standards and cleaner architecture are steps toward a more modern, consistent experience. If you want to:

* Keep using features like session discovery
* Access previously deprecated endpoints
* Avoid breaking test failures

… then **start preparing today** by:

✅ Updating your Node.js and npm  
✅ Auditing your use of removed/modified endpoints  
✅ Scoping your insecure features  
✅ Ensuring your drivers are up to date

---

## ☁️ Cloud Providers Supporting Appium 3

 Notably, LambdaTest has announced industry-first beta support for Appium 3, allowing users to leverage their cloud infrastructure for testing.

For more details, check out LambdaTest's announcement: [Industry First: Appium 3 Beta Support on LambdaTest](https://www.lambdatest.com/blog/industry-first-appium-3-beta-support-on-lambdatest/)

<!-- more -->


## 📚 Resources

* 🔗 [Migrating from Appium 2 to 3](https://github.com/appium/appium/blob/master/packages/appium/docs/en/guides/migrating-2-to-3.md)


---

**Ready to make the leap?** Appium 3 is a great step forward in creating more secure, maintainable, and W3C-compliant test automation pipelines. Happy testing!

---
