## A Developer's Overview of Appium

Before reading this document, please ensure that you have read and understood
the more general [introduction to Appium
concepts](/docs/en/about-appium/intro.md) and the more general [contribution
instructions](/CONTRIBUTING.md).

### Technical Vision

Appium aims to be a Mobile JSONWP front-end for the best app automation
technologies. That's it. We want to take all the different useful automation
engines and smooth away their differences and gotchas by making Appium drivers
for them and bringing them under the umbrella of Appium itself. This is very
similar to the goal of the Selenium project. For our part, we want to have
every driver be an independent entity (separate repo, tests, etc...) even as it
uses shared libraries that make the development of an Appium driver as simple
and boilerplate-free as possible. We use modern JavaScript because JavaScript
is everywhere and it's easy for many developers to understand and contribute
back to.

### Developer Community

Anyone is welcome to become an Appium developer; just read this guide and get
some of your code merged, and you are one of us! If you stick around and help
a lot, we will also make you a committer so that you can continue to help the
community more easily. If you are developing code for Appium and have
questions, reach out to the developer community at
`appium-developers@googlegroups.com`. Note that this is a mailing list for
_development_ questions, not _usage_ questions or bug reports. Usage questions
belong on [discuss.appium.io](https://discuss.appium.io). The GitHub issue
tracker is for bug reports and feature requests only.

### Agile Development Workflow

The Appium team runs development according to a very lightweight version of
SCRUM. Every two weeks we begin a new "sprint", or a period of time in which we
have decided what we want to accomplish. Anyone familiar with the Appium
codebase is welcome to attend our sprint planning and participate as a SCRUM
team member for that sprint. No long-term commitments required! During the
sprint, we update each other with daily progress in the `#standup` room in our
[Appium Slack Group](https://appium.slack.com) (there are no real-time daily
standups). At the end of the sprint, to celebrate our accomplishments and
reflect on how things went, we hold a "retrospective", which might result in
a list of things we can try differently or do better next time around.

Ultimately, the goal is to time an Appium release at the end of each sprint, so
every two weeks. We're not quite there, but hopefully we will be soon.

Current meeting times:
* Sprint Planning: every other Monday from 10:00 AM - 10:45 AM (Pacific Time)
* Sprint Retrospective: every other _other_ Friday from 1:00 PM - 1:30 PM (Pacific Time)

We hold meetings using [Zoom](https://zoom.us) video chat.

For project management, we use the [ZenHub](http://zenhub.com) browser plugin,
which adds various features like Kanban boards and Epics to the GitHub
interface. To fully participate in Appium SCRUM, you'll need to have this
browser plugin installed.

If you are interested in participating a sprint, ping `@jlipps` or `@isaac` in
the Appium Slack Group, or DM `@jlipps` on Twitter, and we'll share how to join
the video chat for the next sprint.

### Architecture

Appium is primarily a collection of [node.js](http://nodejs.org) packages that
combine to form a running node.js server. These packages are maintained
independently of one another and each have their own GitHub repo, CI, and
release process. Some packages (like `appium-ios-driver`) are large and add
significant functionality to Appium, while others play a support role and
expose one specific bit of functionality that is reused by other packages.

For an overview of the package hierarchy and the role that each package plays,
please check out our [package
overview](/docs/en/contributing-to-appium/appium-packages.md) doc.

### Transpilation

Appium is written in a new form of JavaScript, called ES6 (or now ES2015).
Because this version of the language is not yet supported natively by older
versions of node.js, Appium code is _transpiled_ to ES5 (the more
widely-supported version of JS). This transpilation process must occur before
any code is run. In addition to the new language features of ES6, we have
adopted two very important keywords from the _subsequent_ version of JS, namely
`async` and `await`, which assist in writing asynchronous code cleanly. Because
of the transpilation step, Appium packages include tools which watch code for
changes and automatically re-transpile the code. Usually, the same tool will
automatically run unit tests as well to ensure that nothing small has broken.
Most Appium packages have this as the default behavior when running `gulp`.

### Linting and Style

It's important for all of Appium's JS to look and feel the same. This includes
style conventions as well as coding patterns and which libraries we use to
solve various problems. You should get familiar with our new [ES2015 Style
Guide](/docs/en/contributing-to-appium/style-guide-2.0.md). When transpiling,
Appium packages will automatically run JSHint or other lint tools and provide
warning or error feedback if the code doesn't conform to our style. These tools
are not necessarily exhaustive of the kinds of style issues we care about, so
we may also mention style issues in our reviews. This isn't to be nit-picky but
to have a clean, consistent, and readable codebase!

### Submitting Code

Getting your code into Appium is easy: just submit a PR to one of our repos and
engage with the maintainers in the review process. We have a number of
requirements for code submissions (but don't worry! If the following seems like
a lot, we will helpfully and patiently walk you through each step. Just send in
your PR and we'll go from there):

* Follow the style of the surrounding code and our Style Guide
* Atomic commits--one commit per logical change (i.e., make sure that commits don't need to come in a group in order for the program to work. It should work at any given commit). Usually this means one commit per PR. You'll want to get very familiar with `git rebase -i` and squashing!
* No merge commits: always rebase on top of latest master (or whatever other branch you're asking to merge into) before submitting your PR.
* Almost all changes should have tests. Bugfixes should at the least have unit tests that prove that the bug has been fixed. New features should have unit tests and in most cases e2e tests to prove that the feature actually works. We will be happy to walk you through the test creation process. Reading the surrounding test code is a good place to start. Our CI systems usually run test coverage statistics and we will likely not merge code that decreases test coverage.

If you do all of these things before submission, your code will almost
certainly be accepted very quickly! Of course, if you're thinking of making
a change to Appium that requires a lot of work, you might reach out to the
developers list to make sure that the change is in line with our philosophy and
in principle something that we'll accept before you get going.

### Testing

Always make sure that your changes are tested! In addition to writing unit and
e2e tests, make sure you run existing tests before you begin to make changes
and before you push code to be reviewed. We do have CI set up for every Appium
repository as a safety net for reviewers to know whether the code they are
reviewing has passed muster. Running tests in any Appium package is easy!
Unless the README says otherwise, here are the things you can do:

```
gulp                    # watch directory to re-transpile on code change, and run unit tests
gulp once               # same as above but don't watch
gulp unit-test          # transpile and run unit tests
gulp e2e-test           # transpile and run end-to-end/functional tests
_FORCE_LOGS=1 <command> # show module log output during test run
```

Note that we have a convention for unit test files to end in `-specs.js` and
for e2e test files to end in `-e2e-specs.js`.

### Releasing

The release process for any Appium module other than the main Appium package is
pretty straightforward (note that you will need to be an NPM owner for the
package if you want to publish it. Ownership is managed by the Appium
committers; talk to @jlipps or @imurchie if you believe you should be an owner
and are not):

0. `rm -rf node_modules && npm install` and run tests to make sure a clean install works.
0. Determine whether we have a patch (bugfix), minor (feature), or major (breaking) release according to the principles of [SemVer](http://semver.org/) (see also this explanation of [how SemVer works with NPM](https://docs.npmjs.com/getting-started/semantic-versioning)).
0. Update the CHANGELOG and/or README with any appropriate changes and commit. Most subpackages don't have a CHANGELOG.
0. Run `npm version <version-type>` with the appropriate version type.
0. Push the appropriate branch to GitHub, and don't forget to include the `--tags` flag to include the tag just created by `npm version`.
0. Run `npm publish` (with `--tag beta` if this isn't an official release).

For the main Appium packages, all the above steps must be taken, but with
several changes. One reason is that for the main package we use NPM shrinkwrap
to ensure dependencies don't change between installations. Another reason is
that we develop on master and release on various branches. The way it works is
as follows: we always develop and add new code to master. When we are ready to
make a new minor or major release (i.e., `1.5.0` or `2.0.0`), we create
a release branch (`1.5` or `2.0` respectively). We then publish off of that
branch. As we feel the need to make patch releases, we first pull the patch
into master, then cherry-pick individual patches to the release branch (perhaps
even multiple release branches). Then we again publish from those branches with
the updated patch version (`1.5.1` or `2.0.1` for example).

**A note about `npm shrinkwrap`:** We use [npm shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap)
in order to lock dependencies on release. Without it, any development on dependent
packages will be reflected when Appium is installed, which may lead to issues. Since
the configuration file, `npm-shrinkwrap.json`, only exists on release branches,
it is necessary to manually manage it during the release process. It needs to be
checked in to GitHub along with changes to `package.json`.

0. Remove the NPM shrinkwrap JSON file if it exists.
0. `rm -rf node_modules && npm install` and run tests to make sure a clean install works.
0. `rm -rf node_modules && npm install --production` to get just the production deps.
0. `npm shrinkwrap` to write the new NPM shrinkwrap JSON file.
0. Determine whether we have a patch (bugfix), minor (feature), or major (breaking) release according to the principles of SemVer.
0. Update `package.json` with the appropriate new version.
0. Update the CHANGELOG/README with appropriate changes and submit for review as a PR, along with shrinkwrap and `package.json` changes. Wait for it to be merged, then pull it into the release branch.
0. Create a tag of the form `v<version>` on the release branch (usually a minor branch like `1.5` or `1.4`), with: `git tag -a v<version>`, e.g., `git tag -a 1.5.0`. This is not necessary for beta versions.
0. Push the tag to upstream: `git push --tags <remote> <branch>`
0. Install dev dependencies (or at least `gulp` and `appium-gulp-plugins`).
0. Run `npm publish` (with `--tag beta` if this isn't an official release).
0. Update the docs at appium.io. Check out the appium.io repo from github, check out the `gh-pages` branch and pull latest. Run `rake publish`.
0. Create a new release on GitHub: go to `https://github.com/appium/appium/releases/tag/v<VERSION>` and hit "Edit Tag". Make the release name `<VERSION>` (e.g., `2.0.5`), then paste in the changelog (but not the changelog header for this version). If it's a beta release, mark as pre-release.
0. Create a new post on discuss.appium.io announcing the release. Post it in the "News" category. Paste in the changelog and any choice comments. Pin it and unpin the previous release post.
0. Notify Appium.app and Appium.exe of the new build so that new GUIs can be released.
0. Notify @jlipps to so he can tweet a link to the discuss post.
