## uiautomator UiSelector

appium可以使用 [UiSelectors](http://developer.android.com/tools/help/uiautomator/UiSelector.html).
进行元素查找，同时也支持[UiScrollable](http://developer.android.com/tools/help/uiautomator/UiScrollable.html)
.

注意：根据索引( index )进行查找并不可靠，请使用 `instance` 代替. 下面的示范是用Ruby语言编写的、针对 api demo （这是一个 appium 测试用的应用）的实例.


找到第一个TextView.

```ruby
# ruby
first_textview = find_element(:uiautomator, 'new UiSelector().className("android.widget.TextView").instance(0)');
```

根据文本text找到第一个元素.

```ruby
# ruby
first_text = find_element(:uiautomator, 'new UiSelector().text("Animation")')
first_text.text # "Animation"
```

发现第一个可以滚动的控件，然后找到一个TextView的文本为“Tabs”。 “Tabs”元素将滚动到视图.

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).getChildByText(new UiSelector().className("android.widget.TextView"), "Tabs")')
```

这是一个特殊的例子：scrollIntoView （滚动到某视图）返回滚动到视图中的元素。 scrollIntoView 允许滚动到任何 UiSelector 元素.

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text("WebView").instance(0));')
element.text # "WebView"
```
