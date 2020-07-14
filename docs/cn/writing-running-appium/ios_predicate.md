## iOS Predicate

*NOTE*: iOS predicates are usable in iOS 9.3 and below using the `-ios uiautomation` locator strategy and they are usable in iOS 10 and above using the `-ios predicate string` locator strategy

It is worth looking at *'-ios uiautomation'* search strategy with **Predicates**.
[UIAutomation JavaScript API](https://developer.apple.com/library/ios/documentation/DeveloperTools/Reference/UIAutomationRef/) has following methods which can are very useful.

```center
(UIAElement) UIAElementArray.firstWithPredicate(PredicateString predicateString)
(UIAElementArray) UIAElementArray.withPredicate(PredicateString predicateString)
```

Native JS search strategy (powered by Apple) provides much more flexibility and is like Xpath.
**[Predicates](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/Predicates/AdditionalChapters/Introduction.html)** can be used to restrict an elements set to select only those ones for which some condition is true.

'-ios uiautomation' example:

```java
// java
appiumDriver.findElementsByIosUIAutomation("collectionViews()[0].cells().withPredicate(\"ANY staticTexts.isVisible == TRUE\")");
```

'-ios predicate string' example:

```java
// java
appiumDriver.findElementsByIosNsPredicate("isWDVisible == 1");
```

\-  will select only those  ```UIACollectionCell``` elements that have visible ```UIAStaticText``` child elements, and themselves are childs of 1st ```UIACollectionView``` element that should be located under the main app window.  Here ```staticTexts()``` and ```isVisible()``` are methods available in ```UIAElementArray``` and ```UIAElement``` classes respectively. **Note that ```UIAElementArray``` numbering begins with ```0``` unlike Xpath where indexes counting starts from ```1```**

Here's a list of available Predicates (mostly taken from [Predicates Programming Guide](https://developer.apple.com/library/ios/documentation/Cocoa/Conceptual/Predicates/AdditionalChapters/Introduction.html))

### Basic Comparisons

= , ==
- The left-hand expression is equal to the right-hand expression:
```center
tableViews()[1].cells().firstWithPredicate("label == 'Olivia' ")

same in Xpath: /UIATableView[2]/UIATableCell[@label = 'Olivia'][1]
```

\>= , =\>
- The left-hand expression is greater than or equal to the right-hand expression.

<= , =<
- The left-hand expression is less than or equal to the right-hand expression.

\>
- The left-hand expression is greater than the right-hand expression.

<
- The left-hand expression is less than the right-hand expression.

!= , <\>
- The left-hand expression is not equal to the right-hand expression.

BETWEEN
- The left-hand expression is between, or equal to either of, the values specified in the right-hand side. The right-hand side is a two value array (an array is required to specify order) giving upper and lower bounds. For example, ```1 BETWEEN { 0 , 33 }```, or ```$INPUT BETWEEN { $LOWER, $UPPER }```.
In Objective-C, you could create a BETWEEN predicate as shown in the following example:

```center
NSPredicate *betweenPredicate =
    [NSPredicate predicateWithFormat: @"attributeName BETWEEN %@", @[@1, @10]];
```

This creates a predicate that matches ```( ( 1 <= attributeValue ) && ( attributeValue <= 10 ) )```

### Boolean Value Predicates

TRUEPREDICATE
- A predicate that always evaluates to ```TRUE``` .

FALSEPREDICATE
- A predicate that always evaluates to ```FALSE```.

### Basic Compound Predicates

AND , &&
- Logical AND.

OR , ||
- Logical OR.

NOT , !
- Logical NOT.

### String Comparisons

String comparisons are by default case and diacritic sensitive. You can modify an operator using the key characters ```c``` and ```d``` within square braces to specify case and diacritic insensitivity respectively, for example ```firstName BEGINSWITH[cd] $FIRST_NAME```

BEGINSWITH
- The left-hand expression begins with the right-hand expression.

```center
scrollViews()[3].buttons().firstWithPredicate("name BEGINSWITH 'results toggle' ")

same in Xpath: /UIAScrollView[4]/UIAButton[starts-with(@name, 'results toggle')][1]
```

CONTAINS
- The left-hand expression contains the right-hand expression.

```center
tableViews()[1].cells().withPredicate("ANY collectionViews[0].buttons.name CONTAINS 'opera'")

same in Xpath: /UIATableView[2]/UIATableCell[UIACollectionView[1]/UIAButton[contains(@name, 'opera')]]
```

ENDSWITH
- The left-hand expression ends with the right-hand expression.

LIKE
- The left hand expression equals the right-hand expression: ? and * are allowed as wildcard characters, where ? matches 1 character and * matches 0 or more characters. In Mac OS X v10.4, wildcard characters do not match newline characters.

```center
tableViews()[0].cells().firstWithPredicate("name LIKE '*Total: $*' ")

same in Xpath: /UIATableView[1]/UIATableCell[matches(@name, '.*Total: \$.*')][1]
```

MATCHES
- The left hand expression equals the right hand expression using a regex -style comparison according to ICU v3 (for more details see the ICU User Guide for [Regular Expressions](http://userguide.icu-project.org/strings/regexp)).

```center
tableViews().firstWithPredicate("value MATCHES '.*of 7' ")

same in Xpath: /UIATableView[matches(@value, '.*of 7')][1]
```

### Aggregate Operations

ANY , SOME
- Specifies any of the elements in the following expression. For example ```ANY children.age < 18``` .

```center
tableViews()[0].cells().firstWithPredicate("SOME staticTexts.name = 'red'").staticTexts().withName('red')

same in Xpath: /UIATableView[1]/UIATableCell[UIAStaticText/@name = 'red'][1]/UIAStaticText[@name = 'red']
```

ALL
- Specifies all of the elements in the following expression. For example ```ALL children.age < 18``` .

NONE
- Specifies none of the elements in the following expression. For example, ```NONE children.age < 18``` . This is logically equivalent to ```NOT (ANY ...)``` .

IN
- Equivalent to an SQL IN operation, the left-hand side must appear in the collection specified by the right-hand side. For example, ```name IN { 'Ben', 'Melissa', 'Matthew' }``` . The collection may be an array, a set, or a dictionary—in the case of a dictionary, its values are used.

array[index]
- Specifies the element at the specified index in the array.

array[FIRST]
- Specifies the first element in the array.

array[LAST]
- Specifies the last element in the array.

array[SIZE]
- Specifies the size of the array
```center
elements()[0].tableViews()[0].cells().withPredicate("staticTexts[SIZE] > 2")
same in Xpath: /*[1]/UIATableView[1]/UIATableCell[count(UIAStaticText) > 2]
```

### Identifiers

**C style identifier**
- Any C style identifier that is not a reserved word.

**\#symbol**
- Used to escape a reserved word into a user identifier.

**[\\]{octaldigit}{3}**
- Used to escape an octal number ( ```\``` followed by 3 octal digits).

**[\\][xX]{hexdigit}{2}**
- Used to escape a hex number ( ```\x``` or ```\X``` followed by 2 hex digits).

**[\\][uU]{hexdigit}{4}**
- Used to escape a Unicode number ( ```\u``` or ```\U``` followed by 4 hex digits).

### Literals

Single and double quotes produce the same result, but they do not terminate each other. For example, ```"abc"``` and ```'abc'``` are identical, whereas ```"a'b'c"``` is equivalent to a space-separated concatenation of ```a, 'b', c```.

FALSE , NO
- Logical false.

TRUE , YES
- Logical true.

NULL , NIL
- A null value.

SELF
- Represents the object being evaluated.

"text"
- A character string.

'text'
- A character string.

**Comma-separated literal array**
- For example, ```{ 'comma', 'separated', 'literal', 'array' }``` .

**Standard integer and fixed-point notations**
- For example, ```1 , 27 , 2.71828 , 19.75``` .

**Floating-point notation with exponentiation**
- For example, ```9.2e-5``` .

0x
- Prefix used to denote a hexadecimal digit sequence.

0o
- Prefix used to denote an octal digit sequence.

0b
- Prefix used to denote a binary digit sequence.

### Reserved Words

The following words are reserved:

`AND, OR, IN, NOT, ALL, ANY, SOME, NONE, LIKE, CASEINSENSITIVE, CI, MATCHES, CONTAINS, BEGINSWITH, ENDSWITH, BETWEEN, NULL, NIL, SELF, TRUE, YES, FALSE, NO, FIRST, LAST, SIZE, ANYKEY, SUBQUERY, CAST, TRUEPREDICATE, FALSEPREDICATE`

### Appium predicate helpers

Appium has [helpers for predicate search](https://github.com/appium/appium-uiauto/blob/3052dace828db2ab3d722281fb7853cbcbc3252f/uiauto/appium/app.js#L68) in app.js:

- `getFirstWithPredicate`
- `getFirstWithPredicateWeighted`
- `getAllWithPredicate`
- `getNameContains`

Here's a Ruby example:

```ruby
# Ruby example
text = 'Various uses'
predicate = "name contains[c] '#{text}' || label contains[c] '#{text}' || value contains[c] '#{text}'"
element = execute_script(%Q(au.mainApp().getFirstWithPredicate("#{predicate}");))

puts element.name # Buttons, Various uses of UIButton
```
