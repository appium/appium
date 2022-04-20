---
title: Write a Test (Python)
---

[Appium Python Client](https://github.com/appium/python-client) client is
an official Appium client in Python, which is available via [pypi](https://pypi.org/project/Appium-Python-Client/)
It inherits [Selenium Python Binding](https://pypi.org/project/selenium/),
so installing the Appium Python Clint includes the selenium binding.

```bash
pip install Appium-Python-Client
```

This example follows `unittest` module.
Appium Python client adds `appium:` vendor prefix automatically.
You usually do not need to take care about the prefix.

```python title="test.py"
--8<-- "./sample-code/quickstarts/py/test.py"
```

Please check [functional test code](https://github.com/appium/python-client/tree/master/test/functional) in Python Client to see working example.
[Documentation](https://appium.github.io/python-client-sphinx/) also helps to find methods.
