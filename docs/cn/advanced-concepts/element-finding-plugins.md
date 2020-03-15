## Element Finding Plugins

As of version 1.9.2, Appium supports the use of plugins that can be used to assist in finding elements, via the `-custom` locator strategy. This is an experimental feature.

### Usage

1. You install a third-party element finding plugin which has been developed according to the Appium element finding plugin standard (see below). (It must, therefore, be a Node module, whether installed via NPM or referenced locally). You can install this plugin wherever you like on your system, though there are three basic options:
    * A directory you manage separately from Appium (by running `npm install <plugin>` in an arbitrary folder)
    * Inside the Appium dependency tree itself (by running `npm install <plugin>` inside the Appium root directory)
    * Globally on your system (by running `npm install -g <plugin>`)

    (Of course, the plugin itself might have its own additional installation or setup instructions, which would be detailed in the plugin's docs.)

2. You add a new capability to your test: `customFindModules`. This capability must be an object with at least one key and one value. The key is called the "plugin shortcut", and the value is called the "plugin reference". In this example:

    ```
    {
        "customFindModules": {
            "plug": "my-element-finding-plugin"
        }
    }
    ```

    "plug" is the shortcut, and "my-element-finding-plugin" is the reference.
    You will use the shortcut in your own test code, so it can be any string
    which is a valid JSON key. The reference must be a reference to the plugin's
    Node module, and it must be formatted in such a way that Appium can
    [require](https://nodejs.org/api/modules.html#modules_require) it using
    Node's [module resolution](https://medium.freecodecamp.org/requiring-modules-in-node-js-everything-you-need-to-know-e7fbd119be8).

Once you've started a session with this capability, we say that the plugin (or plugins---multiple plugins are of course supported) are _registered_. You can find an element using a registered plugin by doing two things:

1. Using the `-custom` locator strategy
2. Prefixing your selector with `<shortcut>:`

So with the example plugin above, if I wanted to find an element using the selector "foo", it would look like this (in imaginary client code):

```js
driver.findElement('-custom', 'plug:foo');
```

In other words, I'm using the `-custom` locator strategy, and sending in the selector `foo`, making sure Appium knows that it is specifically the `plug` plugin which should handle the find request.

In the case where only one plugin is registered, you can omit the shortcut in the selector (since Appium will not be confused about which plugin you want to use):

```js
driver.findElement('-custom', 'foo');
```

The `-custom` locator strategy is not well supported in all Appium clients at this point; check client documentation for the correct invocation for this strategy.

### Developing a Plugin

Anyone can develop an element finding plugin for Appium. The only rules are as follows:

* The plugin must be a Node module which has a named export called `find`
* This method, when called, must return a (possibly empty) array of element objects

When Appium calls your `find` method, it will pass the following parameters:

* An instance of the `driver` object representing the current session (this would be, for example an instance of `XCUITestDriver`)
* A logging object which you can use to write logs into the Appium log
* The selector (a string) the user of your plugin has sent for the purpose of finding the element
* A boolean value: whether the user is looking for multiple elements (true) or not (false). Note that you must always return an array, regardless of whether the user needs more than one element. This flag is passed in case it is useful for optimizing searches that do not require multiple elements returned.

That's all there is to it! See the list of known plugins below for concrete examples.


### List of Known Plugins

* [Test.ai Classifier](https://github.com/testdotai/appium-classifier-plugin)
