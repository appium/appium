## Advanced Applications Management Commands For iOS With WebDriverAgent/XCTest Backend

Since Xcode9 there is a possibility to manage multiple applications in scope of
a single session. It makes it possible to open iOS preferences and change values
there while the application under test is in background and then restore it back
to foreground or check scenarious, where the application under test is
terminated and then started again. Appium for iOS has special set of `mobile:`
subcommands, which provides user interface to such features.

**Important note:** Make sure you don't cache WebElement instances between
application restarts, since they are going to be invalidated after each restart.


### mobile: installApp

Installs given application to the device under test. If the same application is
already installed then it's going to be installed over the existing one, which
allows you to test upgrades. Be careful while reinstalling the main application
under test: make sure that `terminateApp` has been called first, otherwise
WebDriverAgent will detect the state as a potential crash of the application.

#### Supported arguments

 * `app`: The path to an existing .ipa/.app file on the server file system,
   zipped .app file or an URL pointing to a remote .ipa/.zip file. Mandatory argument.

#### Usage examples

```java
// Java
Map<String, Object> params = new HashMap<>();
params.put("app", "http://example.com/myapp.ipa");
js.executeScript("mobile: installApp", params);
```


### mobile: removeApp

Uninstalls an existing application from the device under test. This endpoint
does not verify whether the application is already installed or not before
uninstalling it.

#### Supported arguments

 * `bundleId`: The bundle identifier of the application, which is going to be
   uninstalled. Mandatory argument.

#### Usage examples

```python
# Python
driver.execute_script('mobile: removeApp', {'bundleId': 'com.myapp'});
```


### mobile: isAppInstalled

Verifies whether the application with given bundle identifier is installed on
the device. Returns `true` or `false`.

#### Supported arguments

 * `bundleId`: The bundle identifier of the application, which is going to be
   verified. Mandatory argument.

#### Usage examples

```java
// Java
Map<String, Object> params = new HashMap<>();
params.put("bundleId", "com.myapp");
final boolean isInstalled = (Boolean)js.executeScript("mobile: isAppInstalled", params);
```


### mobile: launchApp

Executes an existing application on the device. If the application is already
running then it will be brought to the foreground.

#### Supported arguments

 * `bundleId`: The bundle identifier of the application, which is going to be
 executed. Mandatory argument.
 * `arguments`: The list of command line arguments. Optional.
 * `environment`: Environemnt variables mapping. Optional.

#### Usage examples

```python
# Python
driver.execute_script('mobile: launchApp', {'bundleId': 'com.myapp',
                                            'arguments': ('-foo', '--bar'),
                                            'environment': {'foo': 'bar'}})
```


### mobile: terminateApp

Terminates an existing application on the device. If the application is not
running then the returned result will be `false`, otherwise `true`.

#### Supported arguments

 * `bundleId`: The bundle identifier of the application, which is going to be
   terminated. Mandatory argument.

#### Usage examples

```java
// Java
Map<String, Object> params = new HashMap<>();
params.put("bundleId", "com.myapp");
final boolean wasRunningBefore = (Boolean)js.executeScript("mobile: terminateApp", params);
```


### mobile: activateApp

Activates an existing application on the device under test and moves it to the
foreground. The application should be already running in order to activate it.
The call is ignored if the application is already in foreground.

#### Supported arguments

 * `bundleId`: The bundle identifier of the application, which is going to be
   brought to the foreground. Mandatory argument.

#### Usage examples

```python
# Python
driver.execute_script('mobile: activateApp', {'bundleId': 'com.myapp'});
```


### mobile: queryAppState

Queries the state of an existing application on the device. There are five
possible application states (check [Apple's documentation](https://developer.apple.com/documentation/xctest/xcuiapplicationstate?language=objc)
for more details):

 * `0`: The current application state cannot be determined/is unknown
 * `1`: The application is not running
 * `2`: The application is running in the background and is suspended
 * `3`: The application is running in the background and is not suspended
 * `4`: The application is running in the foreground

#### Supported arguments

 * `bundleId`: The bundle identifier of the application, which state is going to
   be queried. Mandatory argument.

#### Usage examples

```java
// Java
Map<String, Object> params = new HashMap<>();
params.put("bundleId", "com.myapp");
final int state = (Integer)js.executeScript("mobile: queryAppState", params);
```
