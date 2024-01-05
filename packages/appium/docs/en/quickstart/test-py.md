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

This example uses Python's built-in `unittest` module, though you can use any Python test framework you want.
The Appium Python client adds the `appium:` vendor prefix automatically.
You usually do not need to worry about the prefix.

```python title="test.py"
--8<-- "./sample-code/quickstarts/py/test.py"
```

!!! note

    It's not within the scope of this guide to give a complete run-down on the Python client
    library or everything that's happening here, so we'll leave the code itself unexplained in detail for now.

    - You may want to read up particularly on Appium [Capabilities](../guides/caps.md).
    - [functional test code](https://github.com/appium/python-client/tree/master/test/functional) in Python Client GitHub repository should help to find more working example.
    - [Documentation](https://appium.github.io/python-client-sphinx/) also helps to find methods
    defined in the Appium Python Client.

!!! note

    The sample code is available from [GitHub Appium repository](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/py).


Basically, this code is doing the following:

1. Defining a set of "Capabilities" (parameters) to send to the Appium server so Appium knows what
kind of thing you want to automate.
1. Starting an Appium session on the built-in Android settings app.
1. Finding the "Battery" list item and clicking it.
1. Pausing for a moment purely for visual effect.
1. Ending the Appium session.

That's it! Let's give it a try. Before you run the test, make sure that you have an Appium server
running in another terminal session, otherwise you'll get an error about not being able to connect
to one. Then, you can execute the script:

```bash
python test.py
```

If all goes well, you'll see the Settings app open up and navigate to the "Battery" view before the
app closes again.

Congratulations, you've started your Appium journey! Read on for some [next steps](./next-steps.md) to explore.
