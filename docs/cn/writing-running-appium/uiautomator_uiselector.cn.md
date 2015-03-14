## uiautomator UiSelector

Appium可以使用 [UiSelectors](http://developer.android.com/tools/help/uiautomator/UiSelector.html)
进行元素查找，同时也支持[UiScrollable](http://developer.android.com/tools/help/uiautomator/UiScrollable.html)
.

注意：根据索引 (index) 进行查找并不可靠，请使用实例 (instance) 代替. 下面的示范是用Ruby语言编写的、针对 api demo (这是一个 appium 测试用的应用) 的实例。

翻译者备注：UiSelectors 和 UiScrollable 均是 Android UiAutomator 中的对象，因此以下用法仅适用于 Android 。


找到第一个文本控件 (TextView) 。

```ruby
# ruby
first_textview = find_element(:uiautomator, 'new UiSelector().className("android.widget.TextView").instance(0)');
```

根据文本 (text) 找到第一个元素。


```ruby
# ruby
first_text = find_element(:uiautomator, 'new UiSelector().text("Animation")')
first_text.text # "Animation"
```

找到第一个可滚动的元素， 然后找到文本是 "Tabs" 的文本控件。
"Tabs" 元素就是将要滚动到的控件。

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).getChildByText(new UiSelector().className("android.widget.TextView"), "Tabs")')
```

scrollIntoView 是一个特例，会返回滚动到指定控件的元素。
scrollIntoView 对任何的 UiSelector 都可以执行滚动操作。

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text("WebView").instance(0));')
element.text # "WebView"
```

