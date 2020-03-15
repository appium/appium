## How To Emulate IME Actions Generation

Very often Android developers use [onEditorAction](https://developer.android.com/reference/android/widget/TextView.OnEditorActionListener.html#onEditorAction(android.widget.TextView,%20int,%20android.view.KeyEvent)) callback with `actionId` argument to implement actions handling, for example, when `Search` or `Done` button is pressed on the on-screen keyboard. Appium since version 1.9.2 allows to automate the generation of such actions by providing the special `mobile:` command.


### mobile: performEditorAction

Executes the given editor action on the _currently focused_ element.

#### Supported arguments

 * _action_: The name or an integer code of the editor action to be executed. The following action names are supported: `normal, unspecified, none, go, search, send, next, done, previous`. Read https://developer.android.com/reference/android/view/inputmethod/EditorInfo for more details on this topic.

#### Usage examples

```java
// Java
driver.executeScript("mobile: performEditorAction", ImmutableMap.of("action", "Go"));
```

```python
# Python
driver.execute_script('mobile: performEditorAction', {'action': 'previous'})
```
