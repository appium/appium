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


### Dump file analysis

Read the [Rising Stack article](https://blog.risingstack.com/finding-a-memory-leak-in-node-js/) for more details.
