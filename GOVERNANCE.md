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
consisting of:

* [@jlipps](https://github.com/jlipps)
* [@mykola-mokhnach](https://github.com/mykola-mokhnach)
* [@eglitise](https://github.com/eglitise)
* [@KazuCocoa](https://github.com/KazuCocoa)

They all represent different companies and different types of contribution to
the Appium Project. The TC is responsible for high-level decisions (like
establishing a feature roadmap, accepting sponsorship, organizing conferences,
etc...), adjudicating conflicts between members of the community, and making
changes to the project's governance processes.

* Membership in the TC is granted by unanimous vote of current TC members.
* TC members can step down at any time.
* No more than 1/3 (or 2, whichever is higher) of TC members may belong to the same company.
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

The current committers are (along with their primary areas(s) of ownership or maintenance):

* [@dan-maor](https://github.com/Dan-Maor) - XCUITest driver and iOS internals
* [@dor-bl](https://github.com/Dor-bl) - DotNet client
* [@eglitise](https://github.com/eglitise) - Appium server, Inspector
* [@jlipps](https://github.com/jlipps) - Appium server, Inspector
* [@kazucocoa](https://github.com/KazuCocoa) - all Appium projects
* [@laolubenson](https://github.com/laolubenson) - DotNet client
* [@mwakizaka](https://github.com/mwakizaka) - XCUITest driver
* [@mykola-mokhnach](https://github.com/mykola-mokhnach) - all Appium projects
* [@rerorero](https://github.com/rerorero) - XCUITest/UIA2 driver
* [@saikrishna321](https://github.com/saikrishna321) - Java client
* [@srinivasantarget](https://github.com/SrinivasanTarget) - Java client
* [@tomriddly](https://github.com/tomriddly) - appium-ios-device
* [@valfirst](https://github.com/valfirst) - Java client

See [Emeritus Contributors](#emeritus-contributors) below for a list of people who formerly made
significant contributions to the project but are no longer actively committing.

### Other Contributors

Other, less formal, kinds of contribution are outlined in our [Contributing Guide](https://appium.io/docs/en/latest/contributing/).
We also very much appreciate those who spend their valuable time assisting with the [Appium forums](https://discuss.appium.io).
Current high-level forum contributors and mods include:

* [aleksei](https://discuss.appium.io/u/aleksei/summary)
* [wreed](https://discuss.appium.io/u/wreed/summary)

### Sponsorship

The Appium project welcomes the sponsorship of individuals and organizations. There are two types
of sponsorship: those related to contributions of Appium maintenance and leadership, and those
related to contributions of funds. Both are extremely important to the ongoing health of the
project. Financial sponsorship is mediated through our [OpenCollective page](https://opencollective.com/appium).
Sponsorship tiers and benefits are described below:

- **Development Partners**: The primary need of any open source project is for sustained maintenance and contributorship. Companies that officially sponsor such development with dedicated employee time are recognized as Development Partners, and receive the same benefits as the highest tier of financial sponsorship. To be considered a Development Partner, a company must devote at least 50% of a full-time employee's time to Appium maintenance. This means that the contributors designated by the company must have been appointed as "committers" in good standing of one or more core Appium repositories. (See above for a description of how to become a committer).
- **Strategic Partners**: Representing the highest tier of ongoing financial support for the project, Strategic Partners are what make our compensation scheme for contributors possible, and we thank them for their significant investment into the project! More than financial contribution, Strategic Partners help elevate Appium's position in the industry through marketing and evangelism efforts, and partner with the Appium team to help make Appium better. Along with the Development Partners, Strategic Partners have their logos displayed prominently on our website, and have the ability to link to their Appium-related products in a few relevant places in our documentation.
- **Gold, Silver, and Bronze Sponsors**: these sponsorship levels correspond to different amounts of recurring financial contribution that generously support our contributor compensation scheme. Sponsors at these levels also have the opportunity to display their logo on our website.
- **Backers**: individuals who benefit from the Appium project can also donate on a one-time or recurring basis, at any amount, and will be recognized as Backers for their contribution!

To become a sponsor at one of these levels, follow the process indicated at the [OpenCollective
page](https://opencollective.com/appium).

### Compensation Scheme

With funds received through sponsorship, the Appium project wants to incentivize contributions of
code, documentation efforts, maintenance, and project leadership. We have developed a scheme
(inspired by one developed at the [WebdriverIO](https://github.com/webdriverio/webdriverio)
project) for disbursing funds on a monthly basis to those who contribute to the project, as well as
some other "upstream" open source projects.

Each month, 15% of sponsorship funds received will be donated to upstream projects, based on the
discretion of the current TC. At this point, no attempt will be made to formalize quantitative
notions of relevance. If you manage a project upstream of Appium and would like to be considered as
part of this donation group, give us a shout!

Of the remaining 85% of sponsorship funds, 70% (roughly 60% of the original total) will go to
project Committers (i.e., those in a role of maintenance), and 30% (roughly 25% of the original
total) will go to Contributors (i.e., those making one-off or periodic contributions). The way that
Committers and Contributors are paid for their efforts differs.

For Committers, each Committer will keep a monthly time sheet of hours contributed to the project.
At the end of each month, the hours tracked from all Committers will be totalled, and then the
Committer-allocated funds will be disbursed (via OpenCollective) on a pro rata basis. Within this
scheme, Committers agree not to submit hours worked as part of their employment with a Development
Partner (since this is part of the "sponsorship" contribution of the Development Partner).

For Contributors, when they make contributions which are successfully merged into the project,
a Committer can discretionarily assign a "value tier" to the contribution. The "value tiers" and
corresponding payouts are as follows:

- XS: a trivial change (e.g. a typo change or applying of an automatically suggested security
patch). \$0.
- S: a small but useful change. \$25.
- M: a medium-small or slightly more complex change. \$50.
- L: a very valuable or sizable change. \$100.
- XL: a massive change or set of changes. \$500.

At the end of each month, Committers will total up the number of changes receiving potential
payout. If the total amount of funds allocated for Contributor payout exceeds the total amount to
be paid, then each Contributor will receive an OpenCollective link to claim their funds. If not
enough funds exist to cover all payouts, then the payout amounts will be scaled down in a pro rata
fashion.

The scope for Committer or Contributor payouts is work completed within any "core" Appium
repository (i.e., those officially maintained by the Appium team, residing within the Appium
organization on GitHub, under `https://github.com/appium`).

Some disclaimers: Payments will happen exclusively via OpenCollective. Recipients of funds are
responsible for maintaining their OpenCollective account in a fashion where funds can be disbursed,
and are responsible for any and all tax, financial, or legal consequences of receiving money in
this way. Receipt of funds from this scheme holds the Appium project and the OpenJS Foundation free
of any claim or obligation. While this document exists to clearly and publicly lay out the terms
under which payments are generally made, the TC retains the right to grant or withhold funding on
a discretionary of special basis. Basically, this scheme is run at the project's discretion, and is
not a public service. Making contributions to the project under this scheme does not obligate the
project to pay you for such work, or otherwise compensate you in any way.

### Raising Issues Related to Governance

This governance model necessarily leaves many situations unspecified. If
questions arise as to how a given situation should proceed according to the
overall goals of the project, the best thing to do is to open a GitHub issue
and ping the TC members.

### Emeritus Contributors

* [@aluedeke](https://github.com/aluedeke)
* [@astro03](https://github.com/Astro03)
* [@bayandin](https://github.com/bayandin)
* [@boneskull](https://github.com/boneskull)
* [@bootstraponline](https://github.com/bootstraponline)
* [@dandoveralba](https://github.com/dandoveralba)
* [@ddkjin](https://github.com/ddkjin)
* [@drpy](https://github.com/drpy)
* [@dylanLacey](https://github.com/DylanLacey)
* [@filmaj](https://github.com/filmaj)
* [@gempesaw](https://github.com/gempesaw)
* [@hugs](https://github.com/hugs)
* [@imurchie](https://github.com/imurchie)
* [@jamieEdge](https://github.com/JamieEdge)
* [@jdeff](https://github.com/jdeff)
* [@jonahss](https://github.com/Jonahss)
* [@maudineormsby](https://github.com/maudineormsby)
* [@moizjv](https://github.com/moizjv)
* [@peepa](https://github.com/peepa)
* [@penguinho](https://github.com/penguinho)
* [@sbonebrake](https://github.com/sbonebrake)
* [@scottdixon](https://github.com/scottdixon)
* [@sebv](https://github.com/sebv)
* [@sravanmedarapu](https://github.com/sravanmedarapu)
* [@stuartbrussell-intuit](https://github.com/stuartbrussell-intuit)
* [@tikhomirovSergey](https://github.com/TikhomirovSergey)
* [@titusfortner](https://github.com/titusfortner)
* [@vgrigoruk](https://github.com/vgrigoruk)
* [@vmaxim](https://github.com/vmaxim)
