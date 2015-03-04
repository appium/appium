# iOS 操作

这是值得一看 *'-ios uiautomation'* 搜索策略  **操作**. 随着我使用一段时间后，我发现如下方面需要注意： [UIAutomation JavaScript API](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/_index.html):

```java
(UIAElement) UIAElementArray.firstWithPredicate(PredicateString predicateString)
(UIAElementArray) UIAElementArray.withPredicate(PredicateString predicateString)
```

本地的JS搜索策略（由Apple）提供了更大的灵活性，和XPath操作很像.
**[操作](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/Predicates/predicates.html)** 可以用来限制一个元素设置为仅选择那些其中一些条件是真，来精确定位对象元素.

举个栗子:

```java
appiumDriver.findElementsByIosUIAutomation("collectionViews()[0].cells().withPredicate(\"ANY staticTexts.isVisible == TRUE\")")
```

\-  将只选择那些   ```UIACollectionCell``` 有可见的元素 ```UIAStaticText``` 子元素, 和选择自己的第一个孩子 ```UIACollectionView``` 在这里应位于主应用程序窗口下，这里 ```staticTexts()``` 和 ```isVisible()``` 有可用的方法 ```UIAElementArray``` 和 ```UIAElement``` 类别分开. **请注意 ```UIAElementArray``` 序列编号从 ```0``` 开始，而不是像xpath从 ```1```开始**

这是一个实用的操作（大多是 [操作 编程指南](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/Predicates/predicates.html))

## 基础比较

= , ==
- 左边表达式等于右边表达式的覆盖范围和内容:
```javascript
tableViews()[1].cells().firstWithPredicate("label == 'Olivia' ")

same in Xpath: /UIATableView[2]/UIATableCell[@label = 'Olivia'][1]
```

\>= , =\>
- 左边表达式大于等于右边表达式的覆盖范围和内容.

<= , =<
- 左边表达式小于等于右边表达式的覆盖范围和内容.

\>
- 左边表达式大于右边表达式的覆盖范围和内容.

<
- 左边表达式小于右边表达式的覆盖范围和内容.

!= , <\>
- 左边表达式不等于右边表达式的覆盖范围和内容.

BETWEEN
- 左边在右边表达式范围内容，右边表达式为一个二维数组(其中这个二维数组是由次序的) 还有上限和下限，例如 ```1 BETWEEN { 0 , 33 }```, 或者 ```$INPUT BETWEEN { $LOWER, $UPPER }```.
在 Objective-C, 你可以创建一个限定操作，如下面的示例所示:

```objectivec
NSPredicate *betweenPredicate =
    [NSPredicate predicateWithFormat: @"attributeName BETWEEN %@", @[@1, @10]];
```

这将创建一个操作去匹配 ```( ( 1 <= attributeValue ) && ( attributeValue <= 10 ) )```

## 布尔值操作

TRUE 操作
- 一个表达式恒等于 ```TRUE``` .

FALSE操作
- 一个表达式恒等于 ```FALSE```.

## 基本的复合操作

AND , &&
-  AND 逻辑.

OR , ||
-  OR 逻辑.

NOT , !
-  NOT 逻辑.

## 字符串比较

字符串比较是默认情况下并且出错较高，你可以使用关键字帮助判断  ```c``` 和 ```d```在方括号指定的情况下，分别区别不敏感，例如 名字的开头 ```firstName BEGINSWITH[cd] $FIRST_NAME```

BEGINSWITH
- 左边内容以右边内容开始.

```javascript
scrollViews()[3].buttons().firstWithPredicate("name BEGINSWITH 'results toggle' ")

same in Xpath: /UIAScrollView[4]/UIAButton[starts-with(@name, 'results toggle')][1]
```

CONTAINS
- 左边包含右边内容.

```javascript
tableViews()[1].cells().withPredicate("ANY collectionViews[0].buttons.name CONTAINS 'opera'")

same in Xpath: /UIATableView[2]/UIATableCell[UIACollectionView[1]/UIAButton[contains(@name, 'opera')]]
```

ENDSWITH
- 左边以右边内容为结束.

LIKE
- 左边表达式等于右边表达式? 和 *是作为通配符, 这个 ? 代替任意 1 个字符， * 代替 0 或者更多字符. 在 Mac OS X v10.4, 通配符不能代替换行符.

```javascript
tableViews()[0].cells().firstWithPredicate("name LIKE '*Total: $*' ")

same in Xpath: /UIATableView[1]/UIATableCell[matches(@name, '.*Total: \$.*')][1]
```

MATCHES
- 左手与右手表达表达使用一个正则表达式风格比较根据 ICU v3 (详情请看ICU用户指南 [正则表达式](http://userguide.icu-project.org/strings/regexp)).

```javascript
tableViews().firstWithPredicate("value MATCHES '.*of 7' ")

same in Xpath: /UIATableView[matches(@value, '.*of 7')][1]
```

## 聚合操作

ANY , SOME
- 指定任何下列表达式的元素。例如 ```ANY children.age < 18``` .

```javascript
tableViews()[0].cells().firstWithPredicate("SOME staticTexts.name = 'red'").staticTexts().withName('red')

same in Xpath: /UIATableView[1]/UIATableCell[UIAStaticText/@name = 'red'][1]/UIAStaticText[@name = 'red']
```

ALL
- 指定所有下列表达式的元素。例如 ```ALL children.age < 18``` .

NONE
- 指定所有下列表达式的元素。例如, ```NONE children.age < 18``` . 逻辑上等价于 ```NOT (ANY ...)``` .

IN
- 相当于一个SQL操作，左边的右边必须出现在指定的集合。例如, ```name IN { 'Ben', 'Melissa', 'Matthew' }``` . 收集可能是一个数组，一组，或在词典的词典使用情况，其值.

array[index]
- 指定元素在数组中的指定索引.

array[FIRST]
- 指定数组中的第一个元素.

array[LAST]
- 指定数组中的最后一个元素.

array[SIZE]
- 指定数组的大小
```javascript
elements()[0].tableViews()[0].cells().withPredicate("staticTexts[SIZE] > 2")

same in Xpath: /*[1]/UIATableView[1]/UIATableCell[count(UIAStaticText) > 2]
```

## 标识符

**C语言 标识符**
- 任何C风格的标识符不是保留字.

**\#symbol**
- 用来避免使用的保留字为用户标识符.

**[\\]{octaldigit}{3}**
- 用来避免一个八进制数 ( ```\```后面加上3位八进制).

**[\\][xX]{hexdigit}{2}**
- 用于避免十六进制数 ( ```\x``` 或 ```\X``` 后面加上二进制).

**[\\][uU]{hexdigit}{4}**
- 用于避免的Unicode ( ```\u``` 或 ```\U``` 用于避免的Unicode (

## 文字

单和双引号产生相同的结果，但他们不终止彼此。示范：```"abc"``` and ```'abc'``` 是相同的，而 ```"a'b'c"``` 相当于一个空间隔开的```a, 'b', c```.

FALSE , NO
-  false逻辑.

TRUE , YES
-  true逻辑.

NULL , NIL
- 空值.

SELF
- 代表他本身.

"text"
- 一个字符串.

'text'
- 一个字符串.

**以逗号分隔的文本数组**
- 举个栗子, ```{ 'comma', 'separated', 'literal', 'array' }``` .

**标准的整数和定点表示法**
- 举个栗子, ```1 , 27 , 2.71828 , 19.75``` .

**随着指数的浮点表示法**
- 举个栗子, ```9.2e-5``` .

0x
- 前缀用于十六进制数字序列的这意味着十六进制.

0o
- 前缀用于denote在八进制数字序列这意味着八进制.

0b
- 前缀用于denote在八进制数字序列这意味着八进制.

## 保留字

下面的都是保留字：

`AND, OR, IN, NOT, ALL, ANY, SOME, NONE, LIKE, CASEINSENSITIVE, CI, MATCHES, CONTAINS, BEGINSWITH, ENDSWITH, BETWEEN, NULL, NIL, SELF, TRUE, YES, FALSE, NO, FIRST, LAST, SIZE, ANYKEY, SUBQUERY, CAST, TRUEPREDICATE, FALSEPREDICATE`

## Appium 操作帮助

Appium 有 [ 专门的操作搜索帮助文档](https://github.com/appium/appium-uiauto/blob/3052dace828db2ab3d722281fb7853cbcbc3252f/uiauto/appium/app.js#L68) in app.js:

- `getFirstWithPredicate`
- `getFirstWithPredicateWeighted`
- `getAllWithPredicate`
- `getNameContains`

这是个Ruby的例子

```ruby
# Ruby example
text = 'Various uses'
predicate = "name contains[c] '#{text}' || label contains[c] '#{text}' || value contains[c] '#{text}'"
element = execute_script(%Q(au.mainApp().getFirstWithPredicate("#{predicate}");))

puts element.name # Buttons, Various uses of UIButton
```
