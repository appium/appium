# Appium Project Governance

The Appium Project wants as much as possible to operate using procedures that
are fair, open, inviting, and ultimately good for the community. For that
reason we find it valuable to codify some of the ways that the Project goes
about its day-to-day business. We want to make sure that no matter who you are,
you have the opportunity to contribute to Appium. We want to make sure that no
one corporation can exert undue influence on the community or hold the Project
hostage. And likewise we want to make sure that corporations which benefit from
Appium are also incentivized to give back.

### The Technical Committee

The project is officially led by a Technical Committee (TC), currently
consisting of [@jlipps](https://github.com/jlipps),
[@bootstraponline](https://github.com/bootstraponline),
[@penguinho](https://github.com/penguinho), and
[@dandoveralba](https://github.com/dandoveralba), who all represent different
companies and different types of contribution to the Appium Project. The TC is
responsible for high-level decisions (like establishing a feature roadmap,
accepting sponsorship, organizing conferences, etc...), adjudicating conflicts
between members of the community, and making changes to the project's
governance processes.

* Membership in the TC is granted by unanimous vote of current TC members.
* TC members can step down at any time.
* No more than 1/4 of TC members may belong to the same company.
* Changes to project governance require unanimous vote of the TC.

### Project Committers

Most of the project maintenance is handled by committers, community members who
have been granted commit access to the Appium organization on GitHub. The
responsibilities of committers include: reviewing and merging pull requests,
walking through changes with developers, weighing in on architectural issues,
and so on.

* Any two TC members can decide to make someone a project committer, providing that person has shown an appropriate understanding of the Appium codebase through prior contributions of code.
* In general any committer can review and merge a PR. In general committers should only merge code they are qualified to review, which might entail pinging another committer who has greater ownership over a specific code area.
* Debates between committers about whether code should be merged should happen in GitHub pull requests.
* Proposals for large changes to the project's code (architectural changes, etc...) should be brought forward as a GitHub issue (with the label `Proposal`), and all committers should be pinged so they can weigh in on the discussion if desired. Substantial changes, whether in proposal stage or in pull request stage should be signed off on by 1 TC member and at least 2 other committers. To assist in the discussion, a small proof of concept can be undertaken on a subset of the Appium ecosystem and raised as a strawman PR, to give flesh to the proposal and make discussion more helpfully concrete.
* In general disputes about code should be resolved by discussion, not votes. If there is substantial disagreement, aim for consensus. If that is not possible, committers can bring the dispute to the TC for a vote, with the outcome determined by a majority.
* Any committer can decide to close a PR or issue if they determine the change doesn't suit the project.
* Appium has a large ecosystem of repositories. Some are 'core' in the sense of being central subpackages with a lot of traffic like `appium/appium` or `appium/appium-ios-driver`. Others are 'peripheral' in the sense of receiving few changes, being maintained by 1 person or no one, etc..., like `appium/ruby_lib` or `appium/appium_thor` For 'core' repos, committers should not merge their own code straightaway. Like all contributors they should open a PR and get a +1 from another committer. For 'peripheral' repos for which they are the sole maintainer or for which they have a good understanding, it is obtuse to insist on another contributor's +1 and this rule should be relaxed in that case. In sum: use good judgment and don't ram code through without a review when you can help it.

The current committers are (in addition to the TC members above):
[imurchie](https://github.com/imurchie), [sebv](https://github.com/sebv),
[Jonahss](https://github.com/Jonahss), [moizjv](https://github.com/moizjv),
[scottdixon](https://github.com/scottdixon),
[Astro03](https://github.com/Astro03) (appium-dot-exe),
[edgy360](https://github.com/edgy360) (appium-dot-app).

### Contributors

Other, less formal, kinds of contribution are outlined in our
[CONTRIBUTING](/CONTRIBUTING.md) doc.

### Sponsorship

The Appium project welcomes sponsorship of various organizations. Specific
details are not yet available but in general we will accept monetary donations,
contribution of code, contribution of dedicated committers, or donations of
other goods or service (internet hosting, etc...). To begin the conversation,
reach out to one of the TC members.

### Raising Issues Related to Governance

This governance model necessarily leaves many situations unspecified. If
questions arise as to how a given situation should proceed according to the
overall goals of the project, the best thing to do is to open a GitHub issue
and ping the TC members.
