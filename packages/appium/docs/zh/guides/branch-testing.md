---
title: Local Validation Of Extension PRs
---

Sometimes it might be necessary to validate if a remote driver or a plugin PR works for the particular local
environment before it is merged or published. This tutorial describes how to achieve that.

## Requirements

- Recent LTS version of NodeJS. Check [Node.js main page](https://nodejs.org) for the download link.
- Recent version of the Appium server. Use the following commands to ensure you have
  the latest version installed: `npm uninstall appium` and `npm install -g appium`.
- [Git](https://git-scm.com/) should be available locally.

## Installation

- [Check out](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/checking-out-pull-requests-locally) the PR locally.
  There is also an option (although it is less flexible, because you won't be able to easily fetch
  any changes to this PR later) to simply [download](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives) and unzip the sources
  locally. If you choose the later option then no `git` tool would be necessary.
- Navigate to the local driver or plugin folder and run `npm i` from that folder.
- Make sure you don't have the given driver or plugin already installed. Use the `appium driver uninstall <driver_name>`
  or `appium plugin uninstall <plugin_name>` CLI in order to delete any leftovers. The value of
  `<driver_name>`/`<plugin_name>` depends on the actual driver or plugin name the PR has been prepared for.
  If you are not sure which name you need to use then check the content of the `package.json` manifest,
  which must be always located under the root folder of the fetched sources. You should be looking for
  the `"appium" -> "driverName"` entry value there.
- Change the current folder to the one, which is NOT the driver/plugin folder root or its subfolder.
  Also, make sure your current working folder does not contain any extra `package.json` file. If
  it does then simply navigate to any other folder that does not.
- Run the following command in order to link the driver/plugin sources to the Appium server:
  `appium driver install --source=local <full_path_to_driver_folder_with_fetched_sources>` or
  `appium plugin install --source=local <full_path_to_plugin_folder_with_fetched_sources>`.
- Stop the Appium server if it is running and start it again (`appium server --use-drivers=<driver_name>`)
  to check the list of loaded drivers. If the linking succeeded then you must see the driver name and the path to its
  parent folder in the server logs. In case of a plugin it is required to explicitly request
  this plugin to be loaded upon server startup: `appium server --use-plugins=<plugin_name>`.

## Update

After you have tested the PR and there are issues it might be necessary to update the local branch with
the recent changes from Git. Follow the next steps for that:

- Navigate to the parent folder of your local driver/plugin and run `git pull`.
- Stop Appium server if it is running.
- Run `npm i` in the parent folder of your local driver/plugin to rebuild it and update any dependencies if necessary.
- Start Appium server again similarly to how this is done in the corresponding [Installation](#installation) step above.

## Switching Back To a Stable Release

After the PR is merged there is no need to use the local plugin/driver deployment anymore, and it makes sense
to switch back to the package managed by NPM. Follow the next steps for that:

- Unlink the installed driver/plugin from the server by running `appium driver uninstall <driver_name>` or
  `appium plugin uninstall <driver_name>`.
- Delete the local source folder (`rm -rf <full_path_to_plugin_or_driver_folder_with_fetched_sources>`).
- Install the driver or the plugin from NPM. Check the component README in order to find a proper command for that.
