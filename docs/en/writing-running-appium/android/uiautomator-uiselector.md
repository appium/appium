## uiautomator UiSelector

Appium enables searching using [UiSelectors](http://developer.android.com/reference/android/support/test/uiautomator/UiSelector.html).
[UiScrollable](http://developer.android.com/reference/android/support/test/uiautomator/UiScrollable.html)
is also supported.

Note that the index selector is unreliable so prefer instance instead. The
following examples are written against the api demos apk using Ruby.


Find the first textview.

```ruby
# ruby
first_textview = find_element(:uiautomator, 'new UiSelector().className("android.widget.TextView").instance(0)');
```

Find the first element by text.

```ruby
# ruby
first_text = find_element(:uiautomator, 'new UiSelector().text("Animation")')
first_text.text # "Animation"
```

Find the first scrollable element, then find a TextView with the text "Tabs".
The "Tabs" element will be scrolled into view.

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).getChildByText(new UiSelector().className("android.widget.TextView"), "Tabs")')
```

As a special case, scrollIntoView returns the element that is scrolled into view.
scrollIntoView allows scrolling to any UiSelector.

```ruby
# ruby
element = find_element(:uiautomator, 'new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text("WebView").instance(0));')
element.text # "WebView"
```
