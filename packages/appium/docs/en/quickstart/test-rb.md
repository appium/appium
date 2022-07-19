---
title: Write a Test (Ruby)
---


The [AppiumLib](https://github.com/appium/ruby_lib) and the [AppiumLibCore](https://github.com/appium/ruby_lib_core) are Appium officcial client libraries in Ruby, which are available via gem under the [appium_lib](https://rubygems.org/gems/appium_lib) and the [appium_lib_core](https://rubygems.org/gems/appium_lib_core) package names. The appium_lib_core inherits from the Selenium Ruby Binding, and the appium_lib inherits from the appium_lib_core, so intalling these libraries include the selenium binding.

```bash
gem install appium_lib
# or
gem install appium_lib_core
```

The `appium_lib_core` is the main part as an Appium client.
`appium_lib` has various helper methods, but the driver instance was ordinally designed to be used as a global variable. It could causes an issue to handle the instance.
`appium_lib_core` does not have such a global variable.

This example is by the `appium_lib_core` with `test-unit` gem module.
Tes code in `appium_lib` should be similar.

```python title="test.py"
--8<-- "./sample-code/quickstarts/rb/test.rb"
```

!!! note

    It's not within the scope of this guide to give a complete run-down on the Ruby client
    library or everything that's happening here, so we'll leave the code itself unexplained in detail for now.

    - You may want to read up particularly on Appium [Capabilities](../guides/caps.md).
    - [functional test code](https://github.com/appium/ruby_lib_core/tree/master/test/functional) in the appium_lib_core GitHub repository should help to find more working example.
    - Documentation [appium_lib_core](https://www.rubydoc.info/github/appium/ruby_lib_core) and [appium_lib](https://www.rubydoc.info/github/appium/ruby_lib) also helps to find avvailable methods.


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
bundle install
bundle exec ruby test.rb
```

If all goes well, you'll see the Settings app open up and navigate to the "Battery" view before the
app closes again.

Congratulations, you've started your Appium journey! Read on for some next steps to explore.
