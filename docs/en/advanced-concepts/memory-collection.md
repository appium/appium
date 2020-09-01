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
# Go to the directory where appium is installed via npm. 
cd /home/k/.npm-global/lib/node_modules/appium/
# start appium server
node --heapsnapshot-signal=SIGUSR2 . # don't miss the dot in the end

# Get the PID
ps a | grep node 
# Output: 557795 pts/7    Sl+    0:31 node --heapsnapshot-signal=SIGUSR2 .

# When it's time to dump the heap, issue a SIGUSR2 signal. 557798 is the PID found above.
kill -SIGUSR2 557795
# Then the heap dump file is created /home/k/.npm-global/lib/node_modules/appium/Heap.20200901.185347.557795.0.002.heapsnapshot
```

### Dump file analysis

Read the [Rising Stack article](https://blog.risingstack.com/finding-a-memory-leak-in-node-js/) for more details.
