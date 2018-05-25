## Style guide for contributors

Thanks for your contribution to Appium! Here are the principles we use when
writing javascript. Please conform to these so we can merge your pull request
without going back and forth about style. The main principle is: *make your
code look like the surrounding code*.

### JavaScript

With the exception of the code that runs on the devices themselves
([appium-uiautomator2-server](https://github.com/appium/appium-uiautomator2-server) for
Android, [WebDriverAgent](https://github.com/appium/WebDriverAgent) for iOS), Appium is written in [Node.js](https://nodejs.org/). If you are
not familiar with JavaScript, please familiarize yourself before attempting
to modify the code. There are plenty of good, free resources (see, for example,
[You Don't Know JavaScript](https://github.com/getify/You-Dont-Know-JS)).

### Rebasing

Commits in a pull request should consist of [logical changes](https://github.com/appium/appium/pull/920#issuecomment-21588553).
If there are multiple authors, make sure each author has their own commit.
It's not a good idea to modify author information. Merge commits should be
rebased out of pull requests.

### Linting

All code must pass [ESLint](https://eslint.org/). To check your code, you can simply run `npm run lint`
from the Appium repo dir. The configuration is specified in the
[eslint-config-appium](https://github.com/appium/eslint-config-appium) package.

Most modern editors have integration with ESLint. See [here](https://eslint.org/docs/user-guide/integrations) for details.

### Style notes

We use a future version of JavaScript and take advantage of the [Babel](https://babeljs.io/)
transpiler to render it down to what is supported by current versions of
[Node.js](https://nodejs.org/). We use [ES2015](https://babeljs.io/learn-es2015/) (formerly called ES6) with some
not-yet-standard features, namely [async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function). This style guide
must be followed diligently in all Appium contributions! Luckily, linting
will enforce most of these rules!

*   Use two spaces for indentation, *no tabs*
*   Use single spaces around operators

    ```js
    let x = 1;
    ```
    not
    ```js
    let x=1;
    ```

*   Spaces after commas and colons in lists, objects, function calls, etc...

    ```js
    let x = myFunc('lol', {foo: bar, baz: boo});
    ```
    not
    ```js
    let x = myFunc('lol',{foo:bar,baz:boo});
    ```

*   Always end statements with semicolons
*   Brackets for `function`, `if`, etc... go on same line, `else` gets sandwiched

    ```js
    if (foo === bar) {
      // do something
    } else {
      // do something else
    }
    ```
    not
    ```js
    if (foo === bar)
    {
      // do something
    }
    else
    {
      // do something else
    }
    ```

*   Space after `if`, `for`, and `function`:

    ```js
    if (foo === bar) {
    ```
    ```js
    for (let i = 0; i < 10; i ++) {
    ```
    ```js
    let lol = function (foo) {
    ```
    not
    ```js
    if(foo === bar) {
    ```
    ```js
    for(let i = 0; i < 10; i ++) {
    ```
    ```js
    let lol = function(foo) {
    ```

*   Avoid bracketless `if` for one-liners:

    ```js
    if (foo === bar) {
      foo++;
    }
    ```
    not
    ```js
    if (foo === bar)
      foo++;
    ```
    except in the case of short-circuiting to return/error
    ```js
    if (err) return;
    ```
    ```js
    if (err) throw new Error(err);
    ```

*   Use `===`, not `==`, and `!==`, not `!=` for [no surprises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
*   Line length shouldn't be longer than 79 characters
*   Break up long strings like this:

    ```javascript
    myFunc('This is a really long string that's longer ' +
           'than 79 characters so I broke it up, woo');
    ```

*   Comments should line up with code

    ```js
    if (foo === 5) {
      myFunc(foo);
      // foo++;
    }
    ```
    not
    ```js
    if (foo === 5) {
      myFunc(foo);
    //foo++;
    }
    ```

*   Variable names should be camelCased:

    ```js
    let myVariable = 42;
    ```
    not
    ```js
    let my_variable = 42;
    ```

*   Check for `undefined` using Appium's [appium-support](https://github.com/appium/appium-support) package

    ```js
    util.hasValue(myVariable)
    ```

*   Define a variable with a default value

    ```js
    let x = y || z;
    ```
    not
    ```js
    let x = y ? y : z;
    ```

### Test Style:

Tests are written using [mocha](https://mochajs.org/) and [chai](http://chaijs.com/). The WebDriver
library used is [wd](https://github.com/admc/wd).

Keep on the same line if it makes sense semantically and length is not an issue:

Examples:

```js
driver.elementByTagName('el1').should.become('123');

driver
  .elementsByTagName('el1').should.eventually.have.length(0);
```

Alternatively use extra indents to improve readability:

```js
driver
  .elementById('comments')
    .clear()
    .click()
    .keys('hello world')
    .getValue()
    .should.become('hello world')
  .elementById('comments')
    .getValue().should.become('hello world');

driver
  .execute("'NaN'--")
    .should.be.rejectedWith('status: 13');
```
