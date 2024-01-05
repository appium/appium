---
hide:
  - toc

title: Write a Test (JS)
---

To write an Appium test in JavaScript (Node.js), we need to choose an Appium-compatible client
library. The best-maintained library and the one the Appium team recommends using is
[WebdriverIO](https://webdriver.io), so let's use that. Since we already have Appium installed we
know our Node and NPM requirements are already satisfied. So just create a new project directory
somewhere on your computer and then initialize a new Node.js project in it:

```bash
npm init
```

It doesn't really matter what you put in the prompts, just so long as you end up with a valid
`package.json`.


Now, install the `webdriverio` package via NPM:

```bash
npm i --save-dev webdriverio
```

Once this is done, your `package.json` file should include a section like the following:

```json title="package.json"
--8<-- "./sample-code/quickstarts/js/package.json"
```

Now it's time to type up the test itself. Create a new file called `test.js` with the following
contents:

```js title="test.js"
--8<-- "./sample-code/quickstarts/js/test.js"
```

!!! note

    It's not within the scope of this guide to give a complete run-down on the WebdriverIO client
    library or everything that's happening here, so we'll leave the code itself unexplained in
    detail for now. You may want to read up particularly on Appium
    [Capabilities](../guides/caps.md) in addition to familiarizing yourself with the excellent
    [WebdriverIO documentation](https://webdriver.io/docs/gettingstarted) for a fuller explanation
    of the various API commands you see and what their purpose is.

!!! note

    The sample code is available from [GitHub Appium repository](https://github.com/appium/appium/tree/master/packages/appium/sample-code/quickstarts/js).


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
node test.js
```

If all goes well, you'll see the Settings app open up and navigate to the "Battery" view before the
app closes again.

Congratulations, you've started your Appium journey! Read on for some [next steps](./next-steps.md) to explore.
