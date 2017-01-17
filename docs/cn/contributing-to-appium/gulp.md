## Appium gulp commands

[Gulp](http://gulpjs.com) is like `make` for Node.js! We use it to automate all
kinds of appium dev tasks. Here's what you can do:

|Task|Description|
|----|-----------|
|gulp once|Cleans, lints, transpiles and runs unit tests|
|gulp watch|Automatically runs `gulp once` when code changes|
|gulp lint|Runs JSLint|
|gulp jshint|Runs JSHint|
|gulp transpile|Transpiles our ES7/ES2015 code to ES5, generates `/build` directory + contents|
|gulp unit-test|Runs unit tests|
|gulp e2e-test|Runs e2e tests|
|gulp docs|Generates docs/en/writing-running-appium/server-args.md doc|
