import {util} from '@appium/support';
import {
  BASE_DESIRED_CAP_CONSTRAINTS,
  type AppiumServer,
  type BaseDriverCapConstraints,
  type Capabilities,
  type Constraints,
  type DefaultCreateSessionResult,
  type Driver,
  type DriverCaps,
  type DriverData,
  type MultiSessionData,
  type ServerArgs,
  type StringRecord,
  type W3CDriverCaps,
  type InitialOpts,
  type DefaultDeleteSessionResult,
  type SingularSessionData,
} from '@appium/types';
import B from 'bluebird';
import _ from 'lodash';
import {fixCaps, isW3cCaps} from '../helpers/capabilities';
import {calcSignature} from '../helpers/session';
import {DELETE_SESSION_COMMAND, determineProtocol, errors} from '../protocol';
import {processCapabilities, validateCaps} from './capabilities';
import {DriverCore} from './core';
import helpers from './helpers';

const EVENT_SESSION_INIT = 'newSessionRequested';
const EVENT_SESSION_START = 'newSessionStarted';
const EVENT_SESSION_QUIT_START = 'quitSessionRequested';
const EVENT_SESSION_QUIT_DONE = 'quitSessionFinished';
const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';

export class BaseDriver<
    const C extends Constraints,
    CArgs extends StringRecord = StringRecord,
    Settings extends StringRecord = StringRecord,
    CreateResult = DefaultCreateSessionResult<C>,
    DeleteResult = DefaultDeleteSessionResult,
    SessionData extends StringRecord = StringRecord,
  >
  extends DriverCore<C, Settings>
  implements Driver<C, CArgs, Settings, CreateResult, DeleteResult, SessionData>
{
  cliArgs: CArgs & ServerArgs;
  caps: DriverCaps<C>;
  originalCaps: W3CDriverCaps<C>;
  desiredCapConstraints: C;
  server?: AppiumServer;
  serverHost?: string;
  serverPort?: number;
  serverPath?: string;

  constructor(opts: InitialOpts, shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);

    this.caps = {} as DriverCaps<C>;
    this.cliArgs = {} as CArgs & ServerArgs;
  }

  /**
   * Contains the base constraints plus whatever the subclass wants to add.
   *
   * Subclasses _shouldn't_ need to use this. If you need to use this, please create
   * an issue:
   * @see {@link https://github.com/appium/appium/issues/new}
   */
  protected get _desiredCapConstraints(): Readonly<BaseDriverCapConstraints & C> {
    return Object.freeze(_.merge({}, BASE_DESIRED_CAP_CONSTRAINTS, this.desiredCapConstraints));
  }

  /**
   * This is the main command handler for the driver. It wraps command
   * execution with timeout logic, checking that we have a valid session,
   * and ensuring that we execute commands one at a time. This method is called
   * by MJSONWP's express router.
   */
  async executeCommand<T = unknown>(cmd: string, ...args: any[]): Promise<T> {
    // get start time for this command, and log in special cases
    const startTime = Date.now();

    if (cmd === 'createSession') {
      // If creating a session determine if W3C or MJSONWP protocol was requested and remember the choice
      this.protocol = determineProtocol(args);
      this.logEvent(EVENT_SESSION_INIT);
    } else if (cmd === DELETE_SESSION_COMMAND) {
      this.logEvent(EVENT_SESSION_QUIT_START);
    }

    // if we had a command timer running, clear it now that we're starting
    // a new command and so don't want to time out
    await this.clearNewCommandTimeout();

    if (this.shutdownUnexpectedly) {
      throw new errors.NoSuchDriverError('The driver was unexpectedly shut down!');
    }

    // If we don't have this command, it must not be implemented
    if (!this[cmd]) {
      throw new errors.NotYetImplementedError();
    }

    let unexpectedShutdownListener;
    const commandExecutor = async () =>
      await B.race([
        this[cmd](...args),
        new B((resolve, reject) => {
          unexpectedShutdownListener = reject;
          this.eventEmitter.on(ON_UNEXPECTED_SHUTDOWN_EVENT, unexpectedShutdownListener);
        }),
      ]).finally(() => {
        if (unexpectedShutdownListener) {
          // This is needed to prevent memory leaks
          this.eventEmitter.removeListener(
            ON_UNEXPECTED_SHUTDOWN_EVENT,
            unexpectedShutdownListener,
          );
          unexpectedShutdownListener = null;
        }
      });
    const res = this.isCommandsQueueEnabled
      ? await this.commandsQueueGuard.acquire(BaseDriver.name, commandExecutor)
      : await commandExecutor();

    // if we have set a new command timeout (which is the default), start a
    // timer once we've finished executing this command. If we don't clear
    // the timer (which is done when a new command comes in), we will trigger
    // automatic session deletion in this.onCommandTimeout. Of course we don't
    // want to trigger the timer when the user is shutting down the session
    // intentionally
    if (this.isCommandsQueueEnabled && cmd !== DELETE_SESSION_COMMAND) {
      // resetting existing timeout
      await this.startNewCommandTimeout();
    }

    // log timing information about this command
    const endTime = Date.now();
    this._eventHistory.commands.push({cmd, startTime, endTime});
    if (cmd === 'createSession') {
      this.logEvent(EVENT_SESSION_START);
    } else if (cmd === DELETE_SESSION_COMMAND) {
      this.logEvent(EVENT_SESSION_QUIT_DONE);
    }

    return res;
  }

  async startUnexpectedShutdown(
    err: Error = new errors.NoSuchDriverError('The driver was unexpectedly shut down!'),
  ) {
    this.eventEmitter.emit(ON_UNEXPECTED_SHUTDOWN_EVENT, err); // allow others to listen for this
    this.shutdownUnexpectedly = true;
    try {
      if (this.sessionId !== null) {
        await this.deleteSession(this.sessionId);
      }
    } finally {
      this.shutdownUnexpectedly = false;
    }
  }

  async startNewCommandTimeout() {
    // make sure there are no rogue timeouts
    await this.clearNewCommandTimeout();

    // if command timeout is 0, it is disabled
    if (!this.newCommandTimeoutMs) return; // eslint-disable-line curly

    this.noCommandTimer = setTimeout(async () => {
      this.log.warn(
        `Shutting down because we waited ` +
          `${this.newCommandTimeoutMs / 1000.0} seconds for a command`,
      );
      const errorMessage =
        `New Command Timeout of ` +
        `${this.newCommandTimeoutMs / 1000.0} seconds ` +
        `expired. Try customizing the timeout using the ` +
        `'newCommandTimeout' desired capability`;
      await this.startUnexpectedShutdown(new Error(errorMessage));
    }, this.newCommandTimeoutMs);
  }

  assignServer(server: AppiumServer, host: string, port: number, path: string) {
    this.server = server;
    this.serverHost = host;
    this.serverPort = port;
    this.serverPath = path;
  }

  /*
   * Restart the session with the original caps,
   * preserving the timeout config.
   */
  async reset() {
    this.log.debug('Resetting app mid-session');
    this.log.debug('Running generic full reset');

    // preserving state
    const currentConfig = {};
    for (const property of [
      'implicitWaitMs',
      'newCommandTimeoutMs',
      'sessionId',
      'resetOnUnexpectedShutdown',
    ]) {
      currentConfig[property] = this[property];
    }

    try {
      if (this.sessionId !== null) {
        await this.deleteSession(this.sessionId);
      }
      this.log.debug('Restarting app');
      await this.createSession(this.originalCaps);
    } finally {
      // always restore state.
      for (const [key, value] of _.toPairs(currentConfig)) {
        this[key] = value;
      }
    }
    await this.clearNewCommandTimeout();
  }

  /**
   *
   * Historically the first two arguments were reserved for JSONWP capabilities.
   * Appium 2 has dropped the support of these, so now we only accept capability
   * objects in W3C format and thus allow any of the three arguments to represent
   * the latter.
   */
  async createSession(
    w3cCapabilities1: W3CDriverCaps<C>,
    w3cCapabilities2?: W3CDriverCaps<C>,
    w3cCapabilities?: W3CDriverCaps<C>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    driverData?: DriverData[],
  ): Promise<CreateResult> {
    if (this.sessionId !== null) {
      throw new errors.SessionNotCreatedError(
        'Cannot create a new session while one is in progress',
      );
    }

    this.log.debug();

    const originalCaps = _.cloneDeep(
      [w3cCapabilities, w3cCapabilities1, w3cCapabilities2].find(isW3cCaps),
    );
    if (!originalCaps) {
      throw new errors.SessionNotCreatedError(
        'Appium only supports W3C-style capability objects. ' +
          'Your client is sending an older capabilities format. Please update your client library.',
      );
    }

    this.setProtocolW3C();

    this.originalCaps = originalCaps;
    this.log.debug(
      `Creating session with W3C capabilities: ${JSON.stringify(originalCaps, null, 2)}`,
    );

    let caps: DriverCaps<C>;
    try {
      caps = processCapabilities(
        originalCaps,
        this._desiredCapConstraints,
        this.shouldValidateCaps,
      ) as DriverCaps<C>;
      caps = fixCaps(caps, this._desiredCapConstraints, this.log) as DriverCaps<C>;
    } catch (e) {
      throw new errors.SessionNotCreatedError(e.message);
    }

    this.validateDesiredCaps(caps);

    this.sessionId = util.uuidV4();
    this.caps = caps;
    // merge caps onto opts so we don't need to worry about what's where
    this.opts = {..._.cloneDeep(this.initialOpts), ...this.caps};

    // deal with resets
    // some people like to do weird things by setting noReset and fullReset
    // both to true, but this is misguided and strange, so error here instead
    if (this.opts.noReset && this.opts.fullReset) {
      throw new Error(
        "The 'noReset' and 'fullReset' capabilities are mutually " +
          'exclusive and should not both be set to true. You ' +
          "probably meant to just use 'fullReset' on its own",
      );
    }
    if (this.opts.noReset === true) {
      this.opts.fullReset = false;
    }
    if (this.opts.fullReset === true) {
      this.opts.noReset = false;
    }
    this.opts.fastReset = !this.opts.fullReset && !this.opts.noReset;
    this.opts.skipUninstall = this.opts.fastReset || this.opts.noReset;

    // Prevents empty string caps so we don't need to test it everywhere
    if (typeof this.opts.app === 'string' && this.opts.app.trim() === '') {
      delete this.opts.app;
    }

    if (!_.isUndefined(this.caps.newCommandTimeout)) {
      this.newCommandTimeoutMs = (this.caps.newCommandTimeout as number) * 1000;
    }

    this._log.prefix = helpers.generateDriverLogPrefix(this);

    this.log.updateAsyncContext({
      sessionId: this.sessionId,
      sessionSignature: calcSignature(this.sessionId),
    });

    this.log.info(`Session created with session id: ${this.sessionId}`);

    return [this.sessionId, caps] as CreateResult;
  }
  async getSessions() {
    const ret: MultiSessionData<C>[] = [];

    if (this.sessionId) {
      ret.push({
        id: this.sessionId,
        capabilities: this.caps,
      });
    }

    return ret;
  }

  /**
   * Returns capabilities for the session and event history (if applicable)
   */
  async getSession() {
    return (
      this.caps.eventTimings ? {...this.caps, events: this.eventHistory} : this.caps
    ) as SingularSessionData<C, SessionData>;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteSession(sessionId?: string | null) {
    await this.clearNewCommandTimeout();
    if (this.isCommandsQueueEnabled && this.commandsQueueGuard.isBusy()) {
      // simple hack to release pending commands if they exist
      // @ts-expect-error private API
      const queues = this.commandsQueueGuard.queues;
      for (const key of _.keys(queues)) {
        queues[key] = [];
      }
    }
    this.sessionId = null;
  }

  logExtraCaps(caps: Capabilities<C>) {
    const extraCaps = _.difference(_.keys(caps), _.keys(this._desiredCapConstraints));
    if (extraCaps.length) {
      this.log.warn(`The following provided capabilities were not recognized by this driver:`);
      for (const cap of extraCaps) {
        this.log.warn(`  ${cap}`);
      }
    }
  }

  validateDesiredCaps(caps: any): caps is DriverCaps<C> {
    if (!this.shouldValidateCaps) {
      return true;
    }

    try {
      validateCaps(caps, this._desiredCapConstraints);
    } catch (e) {
      throw this.log.errorWithException(
        new errors.SessionNotCreatedError(
          `The desiredCapabilities object was not valid for the ` +
            `following reason(s): ${e.message}`,
        ),
      );
    }

    this.logExtraCaps(caps);

    return true;
  }

  async updateSettings(newSettings: Settings) {
    if (!this.settings) {
      throw this.log.errorWithException('Cannot update settings; settings object not found');
    }
    return await this.settings.update(newSettings);
  }

  async getSettings() {
    if (!this.settings) {
      throw this.log.errorWithException('Cannot get settings; settings object not found');
    }
    return this.settings.getSettings();
  }
}

export * from './commands';

export default BaseDriver;
