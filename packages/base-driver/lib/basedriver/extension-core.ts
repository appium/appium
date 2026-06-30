import { logger, util } from '@appium/support';
import type {
  AppiumLogger,
  BidiModuleMap,
  BiDiResultData,
  IAppiumIpc,
  IIpcSubscription,
  IpcData,
  StringRecord,
} from '@appium/types';
import { EventEmitter } from 'node:events';
import { MAX_LOG_BODY_LENGTH } from '../constants';
import { errors } from '../protocol';
import { BIDI_COMMANDS } from '../protocol/bidi-commands';
import { generateDriverLogPrefix } from './helpers';

export class ExtensionCore {
  bidiEventSubs: Record<string, string[]>;
  bidiCommands: BidiModuleMap = BIDI_COMMANDS as BidiModuleMap;
  _logPrefix?: string;
  // used to handle driver events
  readonly eventEmitter: NodeJS.EventEmitter;
  protected _log!: AppiumLogger;
  private ipc?: IAppiumIpc;

  constructor(logPrefix?: string) {
    this._logPrefix = logPrefix;
    this.bidiEventSubs = {};
    this.eventEmitter = new EventEmitter();
  }

  get log(): AppiumLogger {
    if (!this._log) {
      this.updateLogPrefix(this._logPrefix ?? generateDriverLogPrefix(this));
    }
    return this._log;
  }

  updateLogPrefix(logPrefix: string) {
    this._log = logger.getLogger(logPrefix);
  }

  updateBidiCommands(cmds: BidiModuleMap): void {
    const overlappingKeys = Object.keys(cmds).filter((key) => key in this.bidiCommands);
    if (overlappingKeys.length) {
      this.log.warn(
        `Overwriting existing bidi modules: ${JSON.stringify(overlappingKeys)}. This may not be intended!`,
      );
    }
    this.bidiCommands = {
      ...this.bidiCommands,
      ...cmds,
    };
  }

  doesBidiCommandExist(moduleName: string, methodName: string): boolean {
    try {
      this.ensureBidiCommandExists(moduleName, methodName);
    } catch {
      return false;
    }
    return true;
  }

  ensureBidiCommandExists(moduleName: string, methodName: string): void {
    // if we don't get a valid format for bidi command name, reject
    if (!moduleName || !methodName) {
      throw new errors.UnknownCommandError(
        `Did not receive a valid BiDi module and method name `
          + `of the form moduleName.methodName. Instead received `
          + `'${moduleName}.${methodName}'`,
      );
    }

    // if the command module or method isn't part of our spec, reject
    if (!this.bidiCommands[moduleName]?.[methodName]) {
      throw new errors.UnknownCommandError();
    }

    const { command } = this.bidiCommands[moduleName][methodName];
    // if the command method isn't part of our spec, also reject
    if (!command) {
      throw new errors.UnknownCommandError();
    }

    // If the driver doesn't have this command, it must not be implemented
    const handler = (this as ExtensionCore & Record<string, unknown>)[command];
    if (typeof handler !== 'function') {
      throw new errors.NotYetImplementedError();
    }
  }

  async executeBidiCommand(
    bidiCmd: string,
    bidiParams: StringRecord,
    next?: () => Promise<any>,
    driver?: ExtensionCore,
  ): Promise<BiDiResultData> {
    const handlerType = next && driver ? 'plugin' : 'driver';
    const [moduleName, methodName] = bidiCmd.split('.');
    this.ensureBidiCommandExists(moduleName, methodName);
    const { command, params } = this.bidiCommands[moduleName][methodName];

    // TODO improve param parsing and error messages along the lines of what we have in the http
    // handlers
    const args: any[] = [];
    if (params?.required?.length) {
      for (const requiredParam of params.required) {
        if (bidiParams[requiredParam] === undefined) {
          throw new errors.InvalidArgumentError(
            `The ${requiredParam} parameter was required but you omitted it`,
          );
        }
        args.push(bidiParams[requiredParam]);
      }
    }
    if (params?.optional?.length) {
      for (const optionalParam of params.optional) {
        args.push(bidiParams[optionalParam]);
      }
    }
    const logParams = util.truncateString(JSON.stringify(bidiParams), {
      length: MAX_LOG_BODY_LENGTH,
    });
    this.log.debug(
      `Executing bidi command '${bidiCmd}' with params ${logParams} by passing to ${handlerType} `
        + `method '${command}'`,
    );
    // call the handler with the signature appropriate to extension type (plugin or driver)
    const commandHandler = (
      this as unknown as Record<string, (...handlerArgs: any[]) => Promise<unknown>>
    )[command];
    const response = next && driver
      ? await commandHandler.call(this, next, driver, ...args)
      : await commandHandler.call(this, ...args);
    const finalResponse: BiDiResultData = response === undefined ? {} : (response as BiDiResultData);
    this.log.debug(
      `Responding to bidi command '${bidiCmd}' with `
        + `${util.truncateString(JSON.stringify(finalResponse), { length: MAX_LOG_BODY_LENGTH })}`,
    );
    return finalResponse;
  }

  /**
   * @internal Used by AppiumDriver to wire session IPC; extension authors should use {@link onIpcInit} instead.
   */
  async assignIpc(ipc: IAppiumIpc): Promise<void> {
    this.ipc = ipc;
    try {
      await this.onIpcInit();
    } catch (e) {
      this.log.error(`Error running onIpcInit: `, e);
    }
  }

  async onIpcInit(): Promise<void> {}

  ipcSubscribe<T extends IpcData>(topic: string): IIpcSubscription<T> {
    if (!this.ipc) {
      throw new Error(
        `Cannot subscribe to an IPC topic without an IPC object assigned. `
          + `This is likely a programming error. ipcSubscribe should be called in the `
          + `onIpcInit handler or after you are certain that createSession has completed successfully.`,
      );
    }
    return this.ipc.subscribe<T>(topic, generateDriverLogPrefix(this));
  }
}
