## Memory Collection

Since Node v. 12 it is possible to collect the dumps of Appium's memory usage to be analyzed for problems.
This is _extremely_ useful for finding memory leaks.


### Creating a dump file

To create a dump file at any given time, add the following command line parameter to `node` process, which executes the appium.js script:

```
--heapsnapshot-signal=&lt;signal&gt;
```

where `signal` can be one of available custom signals, for example `SIGUSR2`. Then you will be able to

```
kill -SIGUSR2 &lt;nodePID&gt;
```

Dump files are created in the same folder where the main Appium script has been executed.
They have the `.heapsnapshot` extension, and can be loaded into the Chrome Inspector for further investigation.


#### Examples
```shell
# 1. Go to the directory where appium is installed via NPM using one of the two cd command below, depending on appium 
# is installed globally or locally
## if your appium is globally installed via NPM with command "npm install -g appium":
cd "$(npm -g root)/appium/"
## else if your appium is locally installed via NPM:
cd "$(npm root)/appium/"

# 2. Start appium server with heapsnapshot signal
# "&" at the end puts the process at background, so we can continue working on the same terminal
node --heapsnapshot-signal=SIGUSR2 . &

# 3. Get the PID of previous node process
pid=$!

# 4. When it's time to dump the heap, issue a SIGUSR2 signal to the PID got above
kill -SIGUSR2 $pid
# Then the heap dump file is created in current directory
```


### Dump file analysis

Read the [Rising Stack article](https://blog.risingstack.com/finding-a-memory-leak-in-node-js/) for more details.
