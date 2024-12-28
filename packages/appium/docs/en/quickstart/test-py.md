---
hide:
  - toc

title: Write a Test (Python)
---

The [Appium Python Client](https://github.com/appium/python-client) is
an official Appium client in Python, which is available via pypi under the [Appium-Python-Client](https://pypi.org/project/Appium-Python-Client/) package name.
It inherits from the [Selenium Python Binding](https://pypi.org/project/selenium/),
so installing the Appium Python Client includes the selenium binding.

```bash
pip install Appium-Python-Client
```

Then, simply you could use the client features by importing webdriver module as
`from appium import webdriver` in your test code.
Follow the [Usage](https://github.com/appium/python-client#usage) article in order to
understand how to use the Python client features further.

Once you've managed to successfully run a test, you can read on for some [next steps](./next-steps.md) to explore.
