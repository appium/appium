## uiautomator UiSelector

appium可以搜索使用 [UiSelectors](http://developer.android.com/tools/help/uiautomator/UiSelector.html).
，同时也支持[UiScrollable](http://developer.android.com/tools/help/uiautomator/UiScrollable.html)
.

备注第N个会是可靠的选择，而不是可能是. 下面的示范是用Ruby语言编写的，针对测试apk.


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

发现第一滚动元件，然后找到一个TextView的文本为“Tabs”。 “Tabs”元素将滚动到视图.

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).getChildByText(new UiSelector().className("android.widget.TextView"), "Tabs")')
```

这些特殊的滚动到视图的案例，这是返回到视图滚动元了。 滚动滚动到视图允许任何UiSelector方法.

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text("WebView").instance(0));')
element.text # "WebView"
```
