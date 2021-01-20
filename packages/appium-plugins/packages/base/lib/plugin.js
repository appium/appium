import { logger } from 'appium-support';

export default class BasePlugin {

  // plugins can define new methods for the Appium server to map to command names, of the same
  // format as used in Appium's routes.js, for example, this would be a valid newMethodMap:
  //
  // {
  //   '/session/:sessionId/new_method': {
  //      GET: {command: 'getNewThing'},
  //      POST: {command: 'setNewThing', payloadParams: {required: ['someParam']}}
  //   }
  // }
  newMethodMap = {};

  constructor (pluginName) {
    this.name = pluginName;
    this.logger = logger.getLogger(`Plugin [${pluginName}]`);
  }


  /**
   * Optionally updates an Appium express app and http server, by calling methods that may mutate
   * those objects. For example, you could call:
   *
   * expressApp.get('/foo', handler)
   *
   * In order to add a new route to Appium with this plugin. Or, you could add new listeners to the
   * httpServer object.
   *
   * This method does nothing in BasePlugin, and should be overridden, with this.updatesServer set
   * to true in the constructor, in a final class.
   *
   * @param {object} expressApp - the Express 'app' object used by Appium for route handling
   * @param {http.Server} httpServer - the node HTTP server that hosts the app
   */
  /*async updateServer (expressApp, httpServer) {
  }*/

  /**
   * Handle an Appium command, optionally running and using or throwing away the value of the
   * original Appium behavior (or the behavior of the next plugin in a plugin chain).
   *
   * @param {function} next - a reference to an async function which encapsulates what would
   * normally happen if this plugin were not handling a command. If this is the only plugin
   * handling the command, `await next()` would therefore trigger the normal handling logic in the
   * driver which is in use. If another plugin is registered, it would run *that* plugin's `handle`
   * method and return the result for use here. Note that if this plugin does *not* call
   * `await next()`, then the normal command logic will not be run, and this plugin is responsible
   * for managing new command timeouts and command logging, for example:
   *   `driver.stopNewCommandTimeout()` -- before running plugin logic
   *   `driver.startNewCommandTimeout()` -- after running plugin logic
   *   `driver._eventHistory.commands.push({cmd: cmdName, startTime, endTime}) -- after running
   *   plugin logic
   * @param {BaseDriver} driver - the instance of the Appium driver currently handling commands
   * @param {...object} args - the args that would be applied to the normal command
   *
   * @return {object} - the result to pass to the user
   */
  /*async <cmdName> (next, driver, ...args) {
    return await next();
  }*/

  /**
   * You could also handle all commands generically by implementing 'handle'
   */
  /*async handle (next, driver, cmdName, ...args) {
     return await next();
  }*/

}
