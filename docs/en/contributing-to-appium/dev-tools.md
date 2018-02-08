## Appium development commands

Each Appium package has a number of NPM scripts that are used to automate
development tasks:

| Task             | Description                                            |
|------------------|--------------------------------------------------------|
| npm run build    | Transpile code into the `build` directory              |
| npm run lint     | Runs ESLint                                            |
| npm run test     | Cleans, lints, transpiles, and runs unit tests         |
| npm run e2e-test | Tranpiles and runs functional tests                    |
| npm run watch    | Automatically runs `test` command when code is changed |
| npm run mocha    | Gives access to `mocha` test runner                    |

In addition, the main Appium package has a task `npm generate-docs` which generates
the command documentation.