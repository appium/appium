import { fs, system } from 'appium-support';
import { exec } from 'teen_process';
import log from './logger';
import path from 'path';

const NODE_COMMON_PATHS = [
  process.env.NODE_BIN,
  '/usr/local/bin/node',
  '/opt/local/bin/node',
];

// Look for node
class NodeDetector {
  static async retrieveInCommonPlaces () {
    for (let p of NODE_COMMON_PATHS) {
      if (p && await fs.exists(p)) {
        log.debug(`Node binary found at common place: ${p}`);
        return p;
      }
    }
    log.debug('Node binary wasn\'t found at common places.');
    return null;
  }

  static async retrieveUsingSystemCall () {
    let stdout;
    let cmd = 'which';

    if (system.isWindows()) {
      cmd = 'where';
    }

    try {
      stdout = (await exec(cmd, ['node'])).stdout;
    } catch (err) {
      log.debug(err);
      return null;
    }
    let nodePath = stdout.replace(/[\n\r]/g, "");
    if (await fs.exists(nodePath)) {
      log.debug(`Node binary found using ${cmd} command at: ${nodePath}`);
      return nodePath;
    } else {
      log.debug(`Node binary not found using the ${cmd} command.`);
      return null;
    }
  }

  static async retrieveUsingAppleScript () {
    if (!system.isMac()) {
      log.debug('Not on Darwin, skipping Apple Script');
      return null;
    }

    const appScript = [
      'try'
      , '  set appiumIsRunning to false'
      , '  tell application "System Events"'
      , '    set appiumIsRunning to name of every process contains "Appium"'
      , '  end tell'
      , '  if appiumIsRunning then'
      , '    tell application "Appium" to return node path'
      , '  end if'
      , 'end try'
      , 'return "NULL"'
    ].join("\n");
    let stdout;
    try {
      stdout = (await exec('osascript', ['-e', appScript])).stdout;
    } catch (err) {
      log.debug(err);
      return null;
    }
    let nodePath = stdout.replace("\n", "");
    if (await fs.exists(nodePath)) {
      log.debug(`Node binary found using AppleScript at: ${nodePath}`);
      return nodePath;
    } else {
      log.debug('Node binary not found using AppleScript.');
      return null;
    }
  }

  static async retrieveUsingAppiumConfigFile () {
    let jsonobj;
    try {
      const appiumConfigPath = path.resolve(__dirname, '..', '..', '.appiumconfig.json');
      if (await fs.exists(appiumConfigPath)) {
        jsonobj = JSON.parse(await fs.readFile(appiumConfigPath, 'utf8'));
      }
    } catch (err) {
      log.debug(err);
      return null;
    }
    if (jsonobj && jsonobj.node_bin && await fs.exists(jsonobj.node_bin)) {
      log.debug(`Node binary found using .appiumconfig.json at: ${jsonobj.node_bin}`);
      return jsonobj.node_bin;
    } else {
      log.debug('Node binary not found in the .appiumconfig.json file.');
      return null;
    }
  }

  static async detect () {
    let nodePath = await NodeDetector.retrieveUsingSystemCall() ||
      await NodeDetector.retrieveInCommonPlaces() ||
      await NodeDetector.retrieveUsingAppleScript() ||
      await NodeDetector.retrieveUsingAppiumConfigFile();
    if (nodePath) {
      return nodePath;
    } else {
      log.warn('The node binary could not be found.');
      return null;
    }
  }
}

export default NodeDetector;
