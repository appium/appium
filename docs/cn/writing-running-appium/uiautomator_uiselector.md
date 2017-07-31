## uiautomator UiSelector

Appium 使用 [UiSelectors](http://developer.android.com/reference/android/support/test/uiautomator/UiSelector.html) 来进行查找。
同时也支持 [UiScrollable](http://developer.android.com/reference/android/support/test/uiautomator/UiScrollable.html)。

注意，根据索引查找并不可靠，所以更应该使用实例(instance)。后续的示例是使用 Ruby 来测试 api demos apk。


查找第一个 textview。

```ruby
# ruby
first_textview = find_element(:uiautomator, 'new UiSelector().className("android.widget.TextView").instance(0)');
```

根据文本查找第一个元素。

```ruby
# ruby
first_text = find_element(:uiautomator, 'new UiSelector().text("Animation")')
first_text.text # "Animation"
```

查找第一个可滚动(scrollable)的元素，然后根据文本"Tabs"查找第一个 TextView。
"Tabs"元素将被滚动到可见范围。

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).getChildByText(new UiSelector().className("android.widget.TextView"), "Tabs")')
```

作为一个特例，scrollIntoView 返回的是被滚动到可见范围的元素。
scrollIntoView 允许滚动到任意的 UiSelector。

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text("WebView").instance(0));')
element.text # "WebView"
```

本文由 [NativeZhang](https://github.com/NativeZhang) 翻译，由 [lihuazhang](https://github.com/lihuazhang) 校验。