## Style guide for contributors
## 给贡献者的风格指南

Thanks for your contribution to Appium! Here are the principles we use when
writing javascript. Please conform to these so we can merge your pull request
 without going back and forth about style. The main principle is: *make your
 code look like the surrounding code*.

感谢您对Appium的贡献！以下是我们编写javascript代码时需要遵守的准则，请确认你的提交能符合这些规范，这有利于我们合并你的代码时能保持量好的编码风格。其中最核心的准则是：*使你的代码与其他代码的编码风格保持一致*。


### Rebasing
### 衍合（Rebasing）

Commits in a pull request should consist of [logical changes](https://github.com/appium/appium/pull/920#issuecomment-21588553).
If there are multiple authors, make sure each author has their own commit.
It's not a good idea to modify author information. Merge commits should be
rebased out of pull requests.

每个 pull 请求中的提交（commits）都应该包含[逻辑变更(logical changes)](https://github.com/appium/appium/pull/920#issuecomment-21588553)。
> 第一，包含逻辑变更（logical changes）的提交更容易让人理解。如果你想让人们明白你在做什么，你需要做的就是向人们解释为什么这么做。这有助于提高代码质量和代码可读性。

> 第二，如果我们需要变更你的代码，比起深入阅读源码中的执行步骤，看到一个逻辑变更会使我们的工作更加轻松，特别是如果你像我一样，让两三个工作任务并行进行。

如果有多位贡献者，请确保他们各自都有自己的提交记录，修改作者信息不是一个好主意。合并（merge）提交必须从 pull 请求中 rebase 。

### Linting
### 检错（Linting）

All code (except for code in `bootstrap.js` which uses proprietary Apple
methods) must pass JSLint. To check your code, you can simply run `grunt
lint` from the Appium repo dir. If you've created a new .js file,
please make sure it is covered by the wildcards in `grunt.js` or that it is
added specifically.

所有的代码（除了使用了 Apple 私有方法的`bootstrap.js`代码）必须通过 JSLint 的检错测试。你可以在 Appium 存储目录下，运行`grunt lint`来检查你的代码。如果你已创建一个新的 .js 文件，请确认它在`grunt.js`中被通配符覆盖，或者被专门添加。

It's easy to have your code linted as you type, which makes the whole process
much smoother. We like [jshint](http://www.jshint.com),
which has integrations with a lot of source code editors. The file `
.jshintrc` is checked into the repo, and its contents are:

编辑器的即时检错集成很简单，并且这会使得整个编码过程更加顺利。 我们喜欢 [jshint](http://www.jshint.com), 因为它已经与许多源代码编辑器集成了。将文`.jshintrc`加入到仓库中，它的内容是：

```json
{
  "laxcomma": true,
  "strict": true,
  "undef": true,
  "unused": true,
  "node": true,
  "eqeqeq": true,
  "trailing": true,
  "indent": 2
}
```

Since jshint does not enforce code style anymore, we also use
[jscs](https://github.com/mdevils/node-jscs), for which it also exists some
source editor integrations. The configuration file is:

因为jshint不再强制检查代码风格，我们也使用 [jscs](https://github.com/mdevils/node-jscs)，它其中也集成在一些源代码编辑器中。配置文件为：

```json
{
  "excludeFiles": ["submodules/**", "node_modules/**",
    "./lib/server/static/**", "./lib/devices/firefoxos/atoms/*.js",
    "./test/harmony/**/*.js", "./sample-code/examples/node/**/*-yiewd.js",
    "./sample-code/apps/**", "./sample-code/examples/php/vendor/**"],
  "requireCurlyBraces": ["for", "while", "do", "try", "catch"],
  "requireSpaceAfterKeywords": ["if", "else", "for", "while", "do", "switch",
    "return", "try", "catch", "function"],
  "disallowMixedSpacesAndTabs": true,
  "disallowTrailingWhitespace": true,
  "requireSpacesInFunctionExpression": {
    "beforeOpeningCurlyBrace": true
  }
}
```

These configuration files define the warnings you will see in your favorite
editor. See [this page for jshint](http://www.jshint.com/platforms/) and
[this page for jscs](https://github.com/mdevils/node-jscs#friendly-packages) to
get the list of editors and platforms supported and how setup your editor for
automatic linting.

这些配置文件定义了哪些警告类型将会出现在你的编辑器中。 查看 [this page for jshint](http://www.jshint.com/platforms/) 和 [this page for jscs](https://github.com/mdevils/node-jscs#friendly-packages) ，找到它们各自支持的编辑器和平台的列表，以及如何设置你的编辑器使之能自动化检错。

### Style notes
### 风格注释（Style notes）

*   Use two spaces for indentation, *no tabs*
*   Use single spaces around operators
*   使用两个空格来缩进, *不要使用 tabs*
*   在运算符两边，分别添加一个空格：

    ```javascript
    var x = 1;    
    ```
    
    not
    而不是
    
    ```javascript
    var x=1;
    ```

*   Spaces after commas and colons in lists, objects, function calls, etc...
*   在列表（lists）,对象（objects）,函数调用（function calls）等语句块中，逗号和冒号后面需要添加一个空格：

    ```javascript
    var x = myFunc("lol", {foo: bar, baz: boo});
    ```
    
    not
    而不是
    
    ```javascript
    var x = myFunc("lol",{foo:bar,baz:boo});
    ```

*   Always end statements with semicolons
*   Comma-first
*   代码始终以分号结尾，以逗号开头

    ```javascript
    var x = {
      foo: 'bar'
    , baz: 'boo'
    , wuz: 'foz'
    };
    ```

*   Brackets for `function`, `if`, etc... go on same line, `else` gets sandwiched
*   左花括号应该和`function`,`if`等写在同一行，`else`应该被夹在两个花括号中间：

    ```javascript
    if (foo === bar) {
      // do something
    } else {
      // do something else
    }
    ```

*   Space after `if`, `for`, and `function`:
*   `if`,`for`, 和`function`之后需要添加空格：

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
    而不是
    
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
*   只有一行代码时，`if`语句块的花括号也应该添加上：

    ```javascript
    if (foo === bar) {
      foo++;
    }
    ```
    
    not
    而不是
    
    ```javascript
    if (foo === bar)
      foo++;
    ```
    
    except in the case of short-circuiting to a callback in the event of an error
    
    除了出错后直接调用回调函数（callback）处理错误（error）的语句
    
    ```javascript
    if (err) return cb(err);
    ```

*   Use `===`, not `==`, and `!==`, not `!=` for no surprises
*   Line length shouldn't be longer than 79 characters
*   Break up long strings like this:
*   一般情况下，使用`===`, 而不是`==`；使用`!==`, 而不是`!=`；
*   单行长度不应超过79个字符；
*   截断长字符串使用如下方法：

    ```javascript
    myFunc("This is a really long string that's longer " +
            "than 79 characters so I broke it up, woo");
    ```

*   Comments should line up with code
*   注释需要和上一行代码左对齐：

    ```javascript
    if (foo === 5) {
      myFunc(foo);
      // foo++;
    }
    ```
    
    not
    而不是
    
    ```javascript
    if (foo === 5) {
      myFunc(foo);
    //foo++;
    }
    ```

*   Subclassing by extending prototypes
*   通过拓展原型，来创建子类：

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
*   函数定义中，最后使用回调函数：

    ```javascript
    var foo = function (arg1, arg2, cb) {
      ...
    };
    ```

*   Define functions as variables
*   使用变量来定义函数：

    ```javascript
    var myFunc = function (a, b, c) {};
    ```
    
    not
    而不是
    
    ```javascript
    function myFunc (a, b, c) {}
    ```

*   Variable names should be camelCased:
*   变量名应该是驼峰式大小写风格：

    ```javascript
    var myVariable = 42;
    ```
    
    not
    而不是
    
    ```javascript
    var my_variable = 42;
    ```

*   Check for undefined
*   检查是否有未定义的变量：

    ```javascript
    typeof myVariable === "undefined"
    ```
    
    not
    而不是
    
    ```javascript
    myVariable === undefined
    ```

*   Define a variable with a default value
*   给变量定义默认值：

    ```javascript
    var x = y || z;
    ```
    
    not
    而不是
    
    ```javascript
    var x = y ? y : z;
    ```

### Test Style:
### 测试代码风格（Test Style）:

Keep on the same line if it makes sense semantically and length is not an issue:

在代码语义通顺和长度许可下，可以保持在同一行：

Examples:
样例：

```javascript
  driver.elementByTagName('el1').should.become("123")
    .nodeify(done);

  driver
    .elementsByTagName('el1').should.eventually.have.length(0)
    .nodeify(done);
```

Alternatively use extra indents to improve readability:

或者使用缩进来提高代码的可读性：

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
