Style guide for contributors
============================

Thanks for your contribution to Appium! Here are the principles we use when writing javascript. Please conform to these so we can merge your pull request without going back and forth about style. The main principle is: *make your code look like the surrounding code*.

Linting
-------
All code (except for code in `bootstrap.js` which uses proprietary Apple methods) must pass JSLint. To check your code, you can simply run `grunt lint` from the Appium repo dir. If you've created a new .js file, please make sure it is covered by the wildcards in `grunt.js` or that it is added specifically.

It's easy to have your code linted as you type, which makes the whole process much smoother. We like [jshint](http://www.jshint.com), which has integrations with a lot of source code editors. The file `.jshintrc` is checked into the repo, and its contents are:

```json
{
  "laxcomma": true,
  "strict": true,
  "undef": true,
  "unused": true,
  "trailing": true,
  "node": true,
  "es5": true
}
```

These defined what we want to see warnings about, etc..., while we're editing. See [this page](http://www.jshint.com/platforms/) for the list of editors and platforms and how to get your editor set up with automatic linting.

Style notes
------
*   Use two spaces for indentation, *no tabs*
*   Use single spaces around operators

    ```js
    var x = 1;
    ```
    not
    ```js
    var x=1;
    ```        
    
*   Spaces after commas and colons in lists, objects, function calls, etc...

    ```js
    var x = myFunc("lol", {foo: bar, baz: boo});
    ```
    not
    ```js
    var x = myFunc("lol",{foo:bar,baz:boo});
    ```

*   Always end statements with semicolons
*   Comma-first

    ```js
    var x = {
        foo: 'bar'
        , baz: 'boo'
        , wuz: 'foz'
    };
    ```

*   Brackets for `function`, `if`, etc... go on same line, `else` gets sandwiched

    ```js
    if (foo === bar) {
        // do something
    } else {
        // do something else
    }
    ```

*   Space after `if`:

    ```js
    if (foo === bar) {
    ```
    not
    ```js
    if(foo === bar) {
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

*   Use `===`, not `==`, and `!==`, not `!=` for no surprises
*   Line length shouldn't be longer than 79 characters
*   Break up long strings like this:

    ```js
    myFunc("This is a really long string that's longer " +
            "than 79 characters so I broke it up, woo");
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

*   Subclassing by extending prototypes

    ```js
    var _ = require('underscore');

    var SuperClass = function() {
        this.init();
    };

    SuperClass.prototype.init = function() {
        // initialize
    };

    // Create a subclass
    
    var SubClass = function() {
        this.init();
    };

    _.extend(SubClass.prototype, SuperClass.prototype);
    ```

*   Callbacks are always last in function definitions

    ```js
    var foo = function(arg1, arg2, cb) {
      ...
    };
    ```

*   Define functions as variables

    ```js
    var myFunc = function(a, b, c) {};
    ```
    not
    ```js
    function myFunc(a, b, c) {}
    ```
    
*   Function is not followed by a space. Use `function() {` not `function () {`

*   More to come....
