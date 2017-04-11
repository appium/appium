# Appium Version, Branch, and Release Models

## Versioning

Following 1.3.6, Appium switched to semantic versioning: `major | minor | patch | [-beta{N}]`. E.g., `1.4.1` or `2.4.0-Beta4`.
* Major: API-breaking changes; new features
* Minor: Backward-compatible changes; may or may not include new features
* Patch: Quick fix engineering; no new features

This makes Appium’s versioning consistent with other major projects in the NPM ecosystem. It also works well with the trunk-based development model described below.

## Branching and Release Model

Appium uses [Trunk Based Development](http://paulhammant.com/2013/04/05/what-is-trunk-based-development/). As Paul Hammant explains,

>Trunk Based Development (TBD) is where all developers (for a particular deployable unit) commit to one shared branch under source-control. That branch is going to be colloquially known as trunk. 
>
>… Branches are made for a release. Developers are not allowed to make branches in that shared place. Only release engineers commit to those branches, and indeed create each release branch. They may also cherry-pick individual commits to that branch if there is a desire to do so. 
>
>… The release branch that will live for a short time before it is replaced by another release branch, takes everything from trunk when it is created. In terms of merges, only cherry-picks FROM trunk TO the release branch are supported.

## Milestones

The versioning and release model shape how we set Appium milestones. The next milestone is always a Major.Minor release. Triaged bugs and features that aren't associated with the next Major.Minor release should be backlogged in eponymously-named milestones (i.e., `Bugs` and `Features`). In general, our goal is a minor release every 8 to 10 weeks. This includes approximately a week of Beta testing and another week for fixes and final changes. Hotfixes are released (Major.Minor.Patch) as needed between the Major.Minor versions. This allows us to get fixes out quickly while minimizing the risk of regression.

## Workflow

For Appium, the basic flow looks like this:

   1. All PRs go to `master` (aka `trunk`).
   2. Whoever is leading a release acts as the "release engineer" (RE). When the release is ready to be shared (“Beta" status or better), the RE creates a new branch `v[Major].[Minor].[Patch]-branch`.
   3. PRs continue to go to `master`.
   4. If the release requires fixes committed to `master`, the RE cherrypicks those commits into the release branch. 
   5. The release branch can be amended with hotfixes for subsequent patch releases. This allows the team to carefully scope small changesets for quick release. Fixes can also be pulled into previous release  branches branches when needed.  
   6. Rinse, repeat.

Developers can maintain working branches however they like. These are strictly for personal use. All “official” branches should conform to the model defined above.

### Example

   1. It’s 1 June. The Appium team plans on releasing 20.1-beta on 15 July and the full 20.1 release on 1 August.
   2. For the next six weeks, the team commits their work to `master`.
   3. On 15 July, the acting RE creates `20.1-branch`. The first node is tagged “20.1.0 Beta”.
   4. One team member begins fixing bugs in the beta. The fixes are committed to `master`.
   5. Other contributors begin committing changes that are planned for 20.2. These also go to `master`.
   6. The RE cherrypicks the fixes into `20.1-branch`, leaving the other changes on `master`.
   7. The team celebrates that all the beta bugs are fixed for the 1 August release.
   8. The RE tags HEAD of `20.1-branch` as `20.1.0` and publishes the release.
   9. A few weeks later, a crash is discovered in `20.1.0` and users need a fix NOW.
   10. The acting RE pulls the crash fix from master into `20.1-branch`, tags HEAD as `20.1.1`, and publishes the hotfix.
   11. The cycle repeats once the `20.2` release is ready. 




