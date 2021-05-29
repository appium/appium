# Appium version 1 End Of Life (EOL) Plan

Appium 1 has been around for quite a while and now is the time to move
project development forward and to provide even better automation
experience with Appium version 2.

## Major Changes

The main differences of Appium 1 in comparison to version 2 are the following:

- Platform drivers are now managed separately from the Appium foundation. This means
  each driver could now be updated/installed/removed separately from the umbrella one.
- The foundation modules have been moved to the `@appium` monorepo managed by
  [Lerna](https://github.com/lerna/lerna). These modules are: appium (now `@appium/appium`),
  appium-base-driver (now `@appium/base-driver`), appium-fake-driver (now `@appium/fake-driver`),
  appium-support (now `@appium/support`), appium-doctor (now `@appium/doctor`),
  eslint-config-appium (now `@appium/eslint-config-appium`), appium-test-support (now `@appium/test-support`),
  appium-gulp-plugins (now `@appium/gulp-plugins`).
- Added support of plugins
- Added a CLI to manage drivers and plugins
- Dropped support of JSONWP capabilities. Only W3C-compatible clients are now supported.
- The list of supported command line arguments has been modified to exclude driver-specific ones.
- Drivers compatible to Appium 2 must include a special manifest in their package.json

## Transition Plan

The preliminary date of Appium 2 release is *1st of January 2022*. After this date we won't
do any fixes/features to the old Appium repositories and will switch all the development efforts to
version 2.

### Tasks For Developers

- Finish monorepos setup
- Apply major changes to driver and plugin interfaces (base-driver-related stuff).
Switch all drivers to the monorepo foundation. !Such change would make the affected drivers
incompatible to Appium 1 as soon as it is made!
- Document new features and changes
- Update driver integration tests to cope with W3C requirements
- Stop development for old repositories and switch them to read-only mode. During
  the transition period it might be necessary to backport some changes/fixes to
  these modules though.
- Publish a user tutorial on how to transition from Appium 1 to Appium 2
- Have a public channel where users could be notified about the progress of Appium 1
  deprecation in advance

### Tasks For Users

- Read the updated documentation
- Prepare CI scripts to work with Appium 2
- Update client frameworks or make sure their current ones handle W3C protocol properly
- Test their current scripts with appium@next to make sure they are ready for the transition
