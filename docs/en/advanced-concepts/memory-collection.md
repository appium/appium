## Memory Collection

It is possible to collect the dumps of Appium's memory usage to be analyzed for
problems. This is _extrememly_ useful for finding memory leaks.


### Enabling

The feature is enabled by starting Appium with the `--enable-heapdump`
[server argument](../writing-running-appium/server-args.md)
```
appium --enable-heapdump
```

### Creating a dump file

To create a dump file at any given time, execute the command
```
kill -SIGUSR2 &lt;PID&gt;
```

Dump files are created in the same folder as the main Appium script was executed.
They will have the `.heapsnapshot` extension, and can be loaded into the Chrome
Inspector for further investigation.

### Dump file analysis

Read the [Rising Stack article](https://blog.risingstack.com/finding-a-memory-leak-in-node-js/) for more details.

### Installation

For this feature to work, the [heapdump](https://www.npmjs.com/package/heapdump)
package must be installed and available to the Appium. This can be done either by
installing `heapdump` in the Appium directory
```
cd <location of appium installation>
npm install heapdump
```
Alternatively, since `heapdump` is built on install, it may be helpful to install
it once and then link it to the Appium installation
```
npm install -g heapdump
cd <location of appium installation>
npm link heapdump
```

**Note:** The installation of `heapdump` requires Python 2. If you do not have
Python installed, make sure you install Python 2, not 3. If you have Python 3
installed, install Python 2 (see [stack overflow](https://stackoverflow.com/a/2547577)
for information on having multiple Python versions installed on the same
machine).
