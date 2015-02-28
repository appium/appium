# 贡献者的代码风格指南 

感谢你们对 Appium 的贡献! 这些是我们书写 javascript 代码时使用的基本原则。
请遵守这些，避免风格的来回修改，以便我们可以合并你的 pull 请求。
基本原则就是：*让你的代码看起来和周围的代码一致*。

## 衍合（Rebasing）

每个 pull 请求中的提交（commits）必须包括 [逻辑的变化](https://github.com/appium/appium/pull/920#issuecomment-21588553)。
如果有多个作者，确认每个作者有自己的提交。最好不要修改作者信息。
合并（merge）提交必须从 pull 请求中 rebase 。

## 检错（Linting）

所有的代码 （除了 `bootstrap.js` 的代码，它使用了 Apple 的私有方法） 必须通过 JSLint。
为了检查你的代码，你可以在 Appium 存储目录下，简单地运行 `grunt lint`。
如果你已创建一个新的 .js 文件，请确认它在 `grunt.js` 中被通配符覆盖，或者被专门添加。

边输入边检错你的代码是容易实现的，使得整个进程更加顺利。
我们喜欢 [jshint](http://www.jshint.com), 因为它有与许多源代码编辑器的集成。
文件 `.jshintrc` 加入到仓库中，它的内容是：

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

在编辑代码时，这些定义了我们想要看到的警告类型。
浏览 [网页](http://www.jshint.com/platforms/) ，查看编辑器和平台列表，找到使你的编辑器自动化检错的设置方法。

## 风格注意点

*   使用两个空格来缩进, *不要使用 tabs*
*   在运算符两边，分别添加一个空格

    ```js
    var x = 1;
    ```
    而不是
    ```js
    var x=1;
    ```

*   在 lists, objects, function calls 等中，逗号和冒号后面需要添加一个空格

    ```js
    var x = myFunc("lol", {foo: bar, baz: boo});
    ```
    而不是
    ```js
    var x = myFunc("lol",{foo:bar,baz:boo});
    ```

*   代码语句一般以分号结尾
*   以逗号开头

    ```js
    var x = {
      foo: 'bar'
    , baz: 'boo'
    , wuz: 'foz'
    };
    ```


*   左花括号应该和 `function`, `if` 等 写在同一行, `else` 被夹在两个花括号中间。

    ```js
    if (foo === bar) {
      // do something
    } else {
      // do something else
    }
    ```

*   `if`, `for`, 和 `function` 之后需要添加空格：

    ```js
    if (foo === bar) {
    ```
    ```js
    for (var i = 0; i < 10; i ++) {
    ```
    ```js
    var lol = function (foo) {
    ```
    而不是
    ```js
    if(foo === bar) {
    ```
    ```js
    for(var i = 0; i < 10; i ++) {
    ```
    ```js
    var lol = function(foo) {
    ```

*   只有一行代码时，花括号也应该添加上：

    ```js
    if (foo === bar) {
      foo++;
    }
    ```
    而不是
    ```js
    if (foo === bar)
      foo++;
    ```

*   一般情况下，使用 `===`, 而不是 `==`； 使用 `!==`, 而不是 `!=`
*   单行长度不应超过79个字符
*   截断长字符串，方法如下：

    ```js
    myFunc("This is a really long string that's longer " +
            "than 79 characters so I broke it up, woo");
    ```

*   注释需要和上一行代码左对齐

    ```js
    if (foo === 5) {
      myFunc(foo);
      // foo++;
    }
    ```
    而不是
    ```js
    if (foo === 5) {
      myFunc(foo);
    //foo++;
    }
    ```

*   通过拓展原型，来创建子类

    ```js
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

*   函数定义中，最后使用回调函数

    ```js
    var foo = function (arg1, arg2, cb) {
      ...
    };
    ```

*   使用变量来定义函数

    ```js
    var myFunc = function (a, b, c) {};
    ```
    而不是
    ```js
    function myFunc (a, b, c) {}
    ```

*   变量名应该是驼峰式大小写风格:

    ```js
    var myVariable = 42;
    ```
    而不是
    ```js
    var my_variable = 42;
    ```

*   检查是否有未定义的变量

    ```js
    typeof myVariable === "undefined"
    ```
    而不是
    ```js
    myVariable === undefined
    ```

## 试验风格：

在代码语义通顺和长度许可下，可以保持在同一行：

样例：

```js
  driver.elementByTagName('el1').should.become("123")
    .nodeify(done);

  driver
    .elementsByTagName('el1').should.eventually.have.length(0)
    .nodeify(done);
```

或者使用缩进来提高代码的可读性：

```js
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
