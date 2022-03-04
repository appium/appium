## How To Execute Shell Commands On The Remote Device

It is possible to execute any command on the remote Android device or an emulator under test and get the output from it. This action might be potentially insecure and is disabled on the server side by default. One must provide the `--relaxed-security` command line argument while starting the server in order to enable remote shell commands execution (and other insecure features, which are disabled by default). An exception will be thrown if the relaxed security has not been enabled on the server side and one tries to invoke `mobile: shell` endpoint on the client side.


### mobile: shell

Executes the given shell command on the device under test and returns its `stdout` or both `stdout` and `stderr` if `includeStderr` is set to `true`. An exception will be thrown if the command's return code is not zero. This command acts in the same manner as it would be executed via `adb shell` on the host computer.

#### Supported arguments

 * _command_: The name of the remote command. It can also be a full path to an executable, for example `/bin/ls`. The parameter is mandatory.
 * _args_: The list of command arguments represented as an array of strings. If a single string is provided then it will be automatically transformed into one-item array. Optional parameter.
 * _includeStderr_: Set this argument to `true` in order to include stderr output to the returned result along with stdout. If enabled then the returned result will be a map of `stdout` and `stderr` keys containing the corresponding strings otherwise it is just a simple string. `false` by default.
 * _timeout_: The shell command timeout in milliseconds. If the command requires more time to finish execution then an exception is going to be thrown. 20000 ms by default.

#### Usage examples

```java
// Java
Map<String, Object> args = new HashMap<>();
args.put("command", "echo");
args.put("args", Lists.newArrayList("arg1", "arg2"));
String output = driver.executeScript("mobile: shell", args);
assert output.equals("arg1 arg2");
```

```python
# Python
result = driver.execute_script('mobile: shell', {
    'command': 'echo',
    'args': ['arg1', 'arg2'],
    'includeStderr': True,
    'timeout': 5000
})
assert result['stdout'] == 'arg1 arg2'
```

```js
// Javascript
const output = driver.executeScript('mobile: shell', [{
  command: 'ls',
  args: ['/sdcard'],
}]);
