# Style guide for contributors

Thanks for your contribution to Appium! Here are the principles we use when
writing javascript. Please conform to these so we can merge your pull request
 without going back and forth about style. The main principle is: *make your
 code look like the surrounding code*.

## Rebasing

Commits in a pull request should consist of [logical changes](https://github.com/appium/appium/pull/920#issuecomment-21588553).
If there are multiple authors, make sure each author has their own commit.
It's not a good idea to modify author information. Merge commits should be
rebased out of pull requests.

## Linting

All code (except for code in `bootstrap.js` which uses proprietary Apple
methods) must pass JSLint. To check your code, you can simply run `grunt
lint` from the Appium repo dir. If you've created a new .js file,
please make sure it is covered by the wildcards in `grunt.js` or that it is
added specifically.

It's easy to have your code linted as you type, which makes the whole process
much smoother. We like [jshint](http://www.jshint.com),
which has integrations with a lot of source code editors. The file `
.jshintrc` is checked into the repo, and its contents are:

```json
{
  "laxcomma": true,
  "strict": true,
  "undef": true,
  "unused": true,
  "trailing": true,
  "node": true,
  "es5": true,
  "white": true,
  "indent": 2
}
```

These defined what we want to see warnings about, etc...,
while we're editing. See [this page](http://www.jshint.com/platforms/) for
the list of editors and platforms and how to get your editor set up with
automatic linting.

## Style notes

*   Use two spaces for indentation, *no tabs*
*   Use single spaces around operators

    <code>
    var x = 1;
    </code>

    not

    <code>
    var x=1;
    </code>

*   Spaces after commas and colons in lists, objects, function calls, etc...

    <code>
    var x = myFunc("lol", {foo: bar, baz: boo});
    </code>

    not

    <code>
    var x = myFunc("lol",{foo:bar,baz:boo});
    </code>

*   Always end statements with semicolons
*   Comma-first

    <code>
    var x = {
      foo: 'bar'
      , baz: 'boo'
      , wuz: 'foz'
    };
    </code>

*   Brackets for `function`, `if`, etc... go on same line, `else` gets sandwiched

    <code>
    if (foo === bar) {
      // do something
    } else {
      // do something else
    }
    </code>

*   Space after `if`, `for`, and `function`:

    <code>
    if (foo === bar) {
    </code>

    <code>
    for (var i = 0; i < 10; i ++) {
    </code>

    <code>
    var lol = function (foo) {
    </code>

    not

    <code>
    if(foo === bar) {
    </code>

    <code>
    for(var i = 0; i < 10; i ++) {
    </code>

    <code>
    var lol = function(foo) {
    </code>

*   Avoid bracketless `if` for one-liners:

    <code>
    if (foo === bar) {
      foo++;
    }
    </code>

    not

    <code>
    if (foo === bar)
      foo++;
    </code>

*   Use `===`, not `==`, and `!==`, not `!=` for no surprises
*   Line length shouldn't be longer than 79 characters
*   Break up long strings like this:

    <code>
    myFunc("This is a really long string that's longer " +
            "than 79 characters so I broke it up, woo");
    </code>

*   Comments should line up with code

    <code>
    if (foo === 5) {
      myFunc(foo);
      // foo++;
    }
    </code>

    not

    <code>
    if (foo === 5) {
      myFunc(foo);
    //foo++;
    }
    </code>

*   Subclassing by extending prototypes

    <code>
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
    </code>

*   Callbacks are always last in function definitions

    <code>
    var foo = function (arg1, arg2, cb) {
      ...
    };
    </code>

*   Define functions as variables

    <code>
    var myFunc = function (a, b, c) {};
    </code>

    not

    <code>
    function myFunc (a, b, c) {}
    </code>

*   Variable names should be camelCased:

    <code>
    var myVariable = 42;
    </code>

    not

    <code>
    var my_variable = 42;
    </code>

*    Check for undefined

    <code>
    typeof myVariable === "undefined"
    </code>

    not

    <code>
    myVariable === undefined
    </code>

## Test Style

Keep on the same line if it makes sense semantically and length is not an issue:

Examples:

<code>
  driver.elementByTagName('el1').should.become("123")
    .nodeify(done);

  driver
    .elementsByTagName('el1').should.eventually.have.length(0)
    .nodeify(done);
</code>

Alternatively use extra indents to improve readability:

<code>
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
</code>
