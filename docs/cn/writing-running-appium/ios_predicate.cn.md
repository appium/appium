## iOS 谓词(Predicate)

在查看 *'-ios uiautomation'* 搜索策略时了解 **谓词(Predicate)** 十分必要。 [UIAutomation JavaScript API](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/)有下列几种非常有用的方法:

```center
(UIAElement) UIAElementArray.firstWithPredicate(PredicateString predicateString)
(UIAElementArray) UIAElementArray.withPredicate(PredicateString predicateString)
```

原生的JS搜索策略（由Apple提供）提供了更大的灵活性，并且和XPath很像。
**[谓词(Predicate)](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/Predicates/predicates.html)** 可以通过使用多个匹配条件来准确定位某一个或某一组元素（相当于只有搜索条件与元素的计算结果为 true 时这些元素才会被认为是匹配的）。

（翻译备注：XPath 是一门用来定位 xml 文档中的元素的语言，能提供基于路径、元素属性等条件的定位策略）

例如:

```java
// java
appiumDriver.findElementsByIosUIAutomation("collectionViews()[0].cells().withPredicate(\"ANY staticTexts.isVisible == TRUE\")")
```

\-  将只选择那些在主视图第一个 ```UIACollectionView``` 元素下的、拥有可见子元素 ```UIAStaticText``` 的 ```UIACollectionCell``` 元素。在这里， ```staticTexts()``` 和 ```isVisible()``` 分别是```UIAElementArray``` 和 ```UIAElement``` 的子方法。 **注意： ```UIAElementArray``` 序列编号从 ```0``` 开始，而不是像 Xpath 那样从 ```1```开始**

以下是所有可用的谓词(Predicate)的列表（主要取自 [谓词(Predicate) 编程指南](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/Predicates/predicates.html))

### 基本比较

= , ==
- 左边表达式等于右边表达式:
```javascript
tableViews()[1].cells().firstWithPredicate("label == 'Olivia' ")

same in Xpath: /UIATableView[2]/UIATableCell[@label = 'Olivia'][1]
```

\>= , =\>
- 左边表达式大于或等于右边表达式。

<= , =<
- 左边表达式小于或等于右边表达式。

\>
- 左边表达式大于右边表达式。

<
- 左边表达式小于右边表达式。

!= , <\>
- 左边表达式不等于右边表达式。

BETWEEN
- 左边表达式的值在右边表达式的两个边界值之间或等于其中一个边界值。右边表达式为一个有两个值的数组，数组的第一个值是上限，第二个值是下限(这个顺序是固定的) ，例如 ```1 BETWEEN { 0 , 33 }```， 或者 ```$INPUT BETWEEN { $LOWER, $UPPER }```。
在 Objective-C， 你可以创建一个自定义的 BETWEEN 谓词(Predicate)，如下面的示例所示:

```center
NSPredicate *betweenPredicate =
    [NSPredicate predicateWithFormat: @"attributeName BETWEEN %@", @[@1, @10]];
```

这创建了一个等价于 ```( ( 1 <= attributeValue ) && ( attributeValue <= 10 ) )``` 的谓词

### 布尔值谓词

TRUEPREDICATE
- 计算结果恒等于 ```TRUE``` 。

FALSEPREDICATE
- 计算结果恒等于 ```FALSE```。

### 基本的复合谓词

AND , &&
-  逻辑与。

OR , ||
-  逻辑或。

NOT , !
-  逻辑非。

### 字符串比较

在默认情况下，字符串比较是区分大小写和音调( diacritic )的，你可以在方括号中用关键字符  ```c``` 和 ```d``` 来修改操作符以相应的指定不区分大小写和变音符号。例如 名字的开头 ```firstName BEGINSWITH[cd] $FIRST_NAME```

（翻译备注：这里的音调是指英文字母的音调，如 `"náive"` 和 `"naive"`。如果不加关键字 `d`，这两个字符串会认为是不等价的。）

BEGINSWITH
- 左边的表达式以右边的表达式作为开始。

```center
scrollViews()[3].buttons().firstWithPredicate("name BEGINSWITH 'results toggle' ")

same in Xpath: /UIAScrollView[4]/UIAButton[starts-with(@name, 'results toggle')][1]
```

CONTAINS
- 左边的表达式包含右边的表达式。

```center
tableViews()[1].cells().withPredicate("ANY collectionViews[0].buttons.name CONTAINS 'opera'")

same in Xpath: /UIATableView[2]/UIATableCell[UIACollectionView[1]/UIAButton[contains(@name, 'opera')]]
```

ENDSWITH
- 左边的表达式以右边的表达式作为结束。

LIKE
- 左边表达式等于右边表达式: ? 和 *可作为通配符， 其中 ? 匹配 1 个字符， * 匹配 0 个或者多个字符。 在 Mac OS X v10.4， 通配符不能匹配换行符。

```center
tableViews()[0].cells().firstWithPredicate("name LIKE '*Total: $*' ")

same in Xpath: /UIATableView[1]/UIATableCell[matches(@name, '.*Total: \$.*')][1]
```

MATCHES
- 左边表达式根据ICU v3的正则表达式风格比较，等于右边表达式 (详情请看ICU用户指南中的 [正则表达式](http://userguide.icu-project.org/strings/regexp))。

```center
tableViews().firstWithPredicate("value MATCHES '.*of 7' ")

same in Xpath: /UIATableView[matches(@value, '.*of 7')][1]
```

### 聚合操作

ANY , SOME
- 指定匹配后续表达式的任意元素。例如 ```ANY children.age < 18``` 。

```center
tableViews()[0].cells().firstWithPredicate("SOME staticTexts.name = 'red'").staticTexts().withName('red')

same in Xpath: /UIATableView[1]/UIATableCell[UIAStaticText/@name = 'red'][1]/UIAStaticText[@name = 'red']
```

ALL
- 指定匹配后续表达式的所有元素。例如 ```ALL children.age < 18``` 。

NONE
- 指定不匹配后续表达式的元素。例如 ```NONE children.age < 18``` 。 逻辑上等价于 ```NOT (ANY ...)``` 。

IN
- 等价于 SQL 的 IN 操作，左边的表达必须出现在右边指定的集合中。例如 ```name IN { 'Ben', 'Melissa', 'Matthew' }``` 。 这个集合可以是一个数组( array )，一个列表( set )， 或者一个字典( dictionary )。当这个集合是字典时，这里使用的是它的值( value )。

array[index]
- 指定数组中特定索引处的元素。

array[FIRST]
- 指定数组中的第一个元素。

array[LAST]
- 指定数组中的最后一个元素。

array[SIZE]
- 指定数组的大小
```center
elements()[0].tableViews()[0].cells().withPredicate("staticTexts[SIZE] > 2")

same in Xpath: /*[1]/UIATableView[1]/UIATableCell[count(UIAStaticText) > 2]
```

### 标识符

**C语言标识符**
- 任何C语言的标识符都不是保留字。

**\#symbol**
- 用来把一个保留字转义为用户标识符。

**[\\]{octaldigit}{3}**
- 用来表示一个八进制数 ( ```\```后面加上3位八进制数字)。

**[\\][xX]{hexdigit}{2}**
- 用于表示十六进制数 ( ```\x``` 或 ```\X``` 后面加上2个十六进制数字)。

**[\\][uU]{hexdigit}{4}**
- 用于表示 Unicode 编码 ( ```\u``` 或 ```\U``` 后面加上4个十六进制数字)。

### 文字 (Literals)

（翻译备注：Literals 在编程语言领域的意思是在代码中可以看得到的(或说可视的)那些值。例如字符串 `"a"`，数组 `[1, 2]`，你可以在代码中一眼看出这是一个字符串，数组还是别的数据类型并知道它的值。这一节说的就是这些值的写法）

单引号和双引号都能产生相同的结果，但他们不会匹配对方（单引号不会匹配双引号）。例如：```"abc"``` and ```'abc'``` 都是可识别的 ，但是 ```"a'b'c"``` 等价于```a, 'b', c```。

FALSE , NO
-  表示逻辑上的 false。

TRUE , YES
-  表示逻辑上的 true。

NULL , NIL
- 空值。

SELF
- 代表被使用的对象本身。

"text"
- 一个字符串。

'text'
- 同上，也是一个字符串。

**以逗号分隔的文本数组**
- 举个例子 ```{ 'comma', 'separated', 'literal', 'array' }``` 。

**标准的整数和小数**
- 举个例子 ```1 , 27 , 2.71828 , 19.75``` 。

**带有幂指数的小数**
- 举个例子 ```9.2e-5``` 。

0x
- 十六进制数的前缀， 如`0x11`表示十六进制数11，等同于十进制的17。

0o
- 八进制数的前缀。

0b
- 二进制数的前缀。

### 保留字

下面的都是保留字：

`AND, OR, IN, NOT, ALL, ANY, SOME, NONE, LIKE, CASEINSENSITIVE, CI, MATCHES, CONTAINS, BEGINSWITH, ENDSWITH, BETWEEN, NULL, NIL, SELF, TRUE, YES, FALSE, NO, FIRST, LAST, SIZE, ANYKEY, SUBQUERY, CAST, TRUEPREDICATE, FALSEPREDICATE`

### Appium 谓词(predicate)帮助文档

Appium 在app.js中有 [专门的谓词(predicate)使用帮助文档](https://github.com/appium/appium-uiauto/blob/3052dace828db2ab3d722281fb7853cbcbc3252f/uiauto/appium/app.js#L68) :

- `getFirstWithPredicate`
- `getFirstWithPredicateWeighted`
- `getAllWithPredicate`
- `getNameContains`

如下是个Ruby的例子

```ruby
# Ruby example
text = 'Various uses'
predicate = "name contains[c] '#{text}' || label contains[c] '#{text}' || value contains[c] '#{text}'"
element = execute_script(%Q(au.mainApp().getFirstWithPredicate("#{predicate}");))

puts element.name # Buttons, Various uses of UIButton
```
