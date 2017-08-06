## 给贡献者的风格指南

感谢您对Appium的贡献！以下是我们编写javascript代码时需要遵守的准则，请确认你的提交能符合这些规范，这有利于我们合并你的代码时能保持良好的编码风格。其中最核心的准则是：*使你的代码与其他代码的编码风格保持一致*。


### 衍合（Rebasing）

每个 pull 请求中的提交（commits）都应该包含[逻辑变更(logical changes)](https://github.com/appium/appium/pull/920#issuecomment-21588553)。
如果有多位贡献者，请确保他们各自都有自己的提交记录，修改作者信息不是一个好主意。合并（merge）提交必须从 pull 请求中 rebase 。

### 检错（Linting）

所有的代码（除了使用了 Apple 私有方法的`bootstrap.js`代码）必须通过 JSLint 的检错测试。你可以在 Appium 存储目录下，运行`grunt lint`来检查你的代码。如果你已创建一个新的 .js 文件，请确认它在`grunt.js`中被通配符覆盖，或者被专门添加。

编辑器的即时检错集成很简单，并且这会使得整个编码过程更加顺利。 我们喜欢 [jshint](http://www.jshint.com), 因为它已经与许多源代码编辑器集成了。将文件`.jshintrc`加入到仓库中，它的内容是：

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

因为jshint不再强制检查代码风格，我们也使用 [jscs](https://github.com/mdevils/node-jscs)，它也集成在一些源代码编辑器中。配置文件为：

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

这些配置文件定义了哪些警告类型将会出现在你的编辑器中。 查看 [this page for jshint](http://www.jshint.com/platforms/) 和 [this page for jscs](https://github.com/mdevils/node-jscs#friendly-packages) ，找到它们各自支持的编辑器和平台的列表，以及如何设置你的编辑器使之能自动化检错。

### 风格注释（Style notes）

*   使用两个空格来缩进, *不要使用 tabs*
*   在运算符两边，分别添加一个空格：

    ```javascript
    var x = 1;    
    ```
    
    而不是
    
    ```javascript
    var x=1;
    ```

*   在列表（lists）,对象（objects）,函数调用（function calls）等语句块中，逗号和冒号后面需要添加一个空格：

    ```javascript
    var x = myFunc("lol", {foo: bar, baz: boo});
    ```
    
    而不是
    
    ```javascript
    var x = myFunc("lol",{foo:bar,baz:boo});
    ```

*   代码始终以分号结尾
×   以逗号开头

    ```javascript
    var x = {
      foo: 'bar'
    , baz: 'boo'
    , wuz: 'foz'
    };
    ```

*   左花括号应该和`function`,`if`等写在同一行，`else`应该被夹在两个花括号中间：

    ```javascript
    if (foo === bar) {
      // do something
    } else {
      // do something else
    }
    ```

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

*   只有一行代码时，`if`语句块的花括号也应该添加上：

    ```javascript
    if (foo === bar) {
      foo++;
    }
    ```
    
    而不是
    
    ```javascript
    if (foo === bar)
      foo++;
    ```
    
    除了出错后直接调用回调函数（callback）处理错误（error）的语句
    
    ```javascript
    if (err) return cb(err);
    ```

*   一般情况下，使用`===`, 而不是`==`；使用`!==`, 而不是`!=`；
*   单行长度不应超过79个字符；
*   截断长字符串使用如下方法：

    ```javascript
    myFunc("This is a really long string that's longer " +
            "than 79 characters so I broke it up, woo");
    ```

*   注释需要和上一行代码左对齐：

    ```javascript
    if (foo === 5) {
      myFunc(foo);
      // foo++;
    }
    ```
    
    而不是
    
    ```javascript
    if (foo === 5) {
      myFunc(foo);
    //foo++;
    }
    ```

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

*   函数定义中，最后使用回调函数：

    ```javascript
    var foo = function (arg1, arg2, cb) {
      ...
    };
    ```

*   使用变量来定义函数：

    ```javascript
    var myFunc = function (a, b, c) {};
    ```
    
    而不是
    
    ```javascript
    function myFunc (a, b, c) {}
    ```

*   变量名应该是驼峰式大小写风格：

    ```javascript
    var myVariable = 42;
    ```
    
    而不是
    
    ```javascript
    var my_variable = 42;
    ```

*   检查是否有未定义的变量：

    ```javascript
    typeof myVariable === "undefined"
    ```
    
    而不是
    
    ```javascript
    myVariable === undefined
    ```

*   给变量定义默认值：

    ```javascript
    var x = y || z;
    ```
    
    而不是
    
    ```javascript
    var x = y ? y : z;
    ```

### 测试代码风格（Test Style）:

在代码语义通顺和长度许可下，可以保持在同一行：

样例：

```javascript
  driver.elementByTagName('el1').should.become("123")
    .nodeify(done);

  driver
    .elementsByTagName('el1').should.eventually.have.length(0)
    .nodeify(done);
```

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

本文由 [wanyukang](https://github.com/wanyukang) 翻译，由 [oscarxie](https://github.com/oscarxie) 校验。
