## How To Execute Shell Commands On The Remote Device

It is possible to execute any command on the remote Android device or an emulator under test and get the output from it. This action might be potentially insecure and is disabled on the server side by default. One must provide the `--relaxed-security` command line argument while starting the server in order to enable remote shell commands execution (and other insecure features, which are disabled by default). An exception will be thrown if the relaxed security has not been enabled on the server side and one tries to invoke `mobile: shell` endpoint on the client side.


### mobile: shell

Executes the given shell command on the device under test and returns its `stdout`. An exception will be thrown if the command's return code is not zero. This command acts in the same manner as it would be executed via `adb shell` on the host computer.

#### Supported arguments

 * _command_: The name of the remote command. It can also be a full path to an executable, for example `/bin/ls`.  The parameter is mandatory.
 * _args_: The list of command arguments represented as an array of strings. If a single string is provided then it will be automatically transformed into one-item array. Optional parameter.

#### Usage examples

```java
// Java
Map<String, Object> args = new HashMap<>();
args.put("command", "echo");
args.put("args", Lists.newArrayList("arg1", "arg2"));
String output = driver.executeScript("mobile: shell", args);
assert output.equals("arg1 arg2");
```
