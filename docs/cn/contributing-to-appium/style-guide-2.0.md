## Style guide for contributors

Thanks for your contribution to Appium! Here are the principles we use when
writing javascript. Please conform to these so we can merge your pull request
 without going back and forth about style. The main principle is: *make your
 code look like the surrounding code*.

### Rebasing

Commits in a pull request should consist of [logical changes](https://github.com/appium/appium/pull/920#issuecomment-21588553).
If there are multiple authors, make sure each author has their own commit.
It's not a good idea to modify author information. Merge commits should be
rebased out of pull requests.

### Linting

All code (except for code in `bootstrap.js` which uses proprietary Apple
methods) must pass JSLint. To check your code, you can simply run `grunt
lint` from the Appium repo dir. If you've created a new .js file,
please make sure it is covered by the wildcards in `grunt.js` or that it is
added specifically.

It's easy to have your code linted as you type, which makes the whole process
much smoother. We like [jshint](http://www.jshint.com),
which has integrations with a lot of source code editors. The file `
.jshintrc` is checked into the repo, so by adding jshint to your editor, you'll
take advantage of the linting.

Since jshint does not enforce code style anymore, we also use
[jscs](https://github.com/mdevils/node-jscs), for which it also exists some
source editor integrations.

These configuration files define the warnings you will see in your favorite
editor. See [this page for jshint](http://www.jshint.com/platforms/) and
[this page for jscs](https://github.com/mdevils/node-jscs#friendly-packages) to
get the list of editors and platforms supported and how setup your editor for
automatic linting.

### Style notes

We use a future version of JavaScript and take advantage of the Babel
transpiler to render it down to what is supported by current versions of
Node.js. We use ES2015 (link needed) (formerly called ES6) with some
not-yet-standard features, namely `async/await` (link needed). This style guide
must be followed diligently in all Appium contributions!

*   Use two spaces for indentation, *no tabs*
*   Use single spaces around operators

    ```javascript
    var x = 1;
    ```
    not
    ```javascript
    var x=1;
    ```

*   Spaces after commas and colons in lists, objects, function calls, etc...

    ```javascript
    var x = myFunc("lol", {foo: bar, baz: boo});
    ```
    not
    ```javascript
    var x = myFunc("lol",{foo:bar,baz:boo});
    ```

*   Always end statements with semicolons
*   Comma-first

    ```javascript
    var x = {
      foo: 'bar'
    , baz: 'boo'
    , wuz: 'foz'
    };
    ```

*   Brackets for `function`, `if`, etc... go on same line, `else` gets sandwiched

    ```javascript
    if (foo === bar) {
      // do something
    } else {
      // do something else
    }
    ```

*   Space after `if`, `for`, and `function`:

    ```javascript
    if (foo === bar) {
    ```
    ```javascript
    for (var i = 0; i < 10; i ++) {
    ```
    ```javascript
    var lol = function (foo) {
    ```
    not
    ```javascript
    if(foo === bar) {
    ```
    ```javascript
    for(var i = 0; i < 10; i ++) {
    ```
    ```javascript
    var lol = function(foo) {
    ```

*   Avoid bracketless `if` for one-liners:

    ```javascript
    if (foo === bar) {
      foo++;
    }
    ```
    not
    ```javascript
    if (foo === bar)
      foo++;
    ```
    except in the case of short-circuiting to a callback in the event of an error
    ```javascript
    if (err) return cb(err);
    ```

*   Use `===`, not `==`, and `!==`, not `!=` for no surprises
*   Line length shouldn't be longer than 79 characters
*   Break up long strings like this:

    ```javascript
    myFunc("This is a really long string that's longer " +
            "than 79 characters so I broke it up, woo");
    ```

*   Comments should line up with code

    ```javascript
    if (foo === 5) {
      myFunc(foo);
      // foo++;
    }
    ```
    not
    ```javascript
    if (foo === 5) {
      myFunc(foo);
    //foo++;
    }
    ```

*   Subclassing by extending prototypes

    ```javascript
    var _ = require('underscore');

    var SuperClass = function () {
      this.init();
    };

    SuperClass.prototype.init = function () {
      // initialize
    };

    // Create a subclass

    var SubClass = function () {
        this.init();
    };

    _.extend(SubClass.prototype, SuperClass.prototype);
    ```

*   Callbacks are always last in function definitions

    ```javascript
    var foo = function (arg1, arg2, cb) {
      ...
    };
    ```

*   Define functions as variables

    ```javascript
    var myFunc = function (a, b, c) {};
    ```
    not
    ```javascript
    function myFunc (a, b, c) {}
    ```

*   Variable names should be camelCased:

    ```javascript
    var myVariable = 42;
    ```
    not
    ```javascript
    var my_variable = 42;
    ```

*    Check for undefined

    ```javascript
    typeof myVariable === "undefined"
    ```
    not
    ```javascript
    myVariable === undefined
    ```

*   Define a variable with a default value

    ```javascript
    var x = y || z;
    ```
    not
    ```javascript
    var x = y ? y : z;
    ```

### Test Style:

Keep on the same line if it makes sense semantically and length is not an issue:

Examples:

```javascript
  driver.elementByTagName('el1').should.become("123")
    .nodeify(done);

  driver
    .elementsByTagName('el1').should.eventually.have.length(0)
    .nodeify(done);
```

Alternatively use extra indents to improve readability:

```javascript
h.driver
  .elementById('comments')
    .clear()
    .click()
    .keys("hello world")
    .getValue()
    .should.become("hello world")
  .elementById('comments')
    .getValue().should.become("hello world")
  .nodeify(done);

h.driver
  .execute("'nan'--")
    .should.be.rejectedWith("status: 13")
  .nodeify(done);
```
