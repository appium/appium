import {logger} from '@appium/support';
import {EventEmitter} from 'node:events';
import type {
  AppiumLogger,
  BidiModuleMap,
  BiDiResultData,
  StringRecord,
} from '@appium/types';
import {
  MAX_LOG_BODY_LENGTH,
} from '../constants';
import {errors} from '../protocol';
import {BIDI_COMMANDS} from '../protocol/bidi-commands';
import _ from 'lodash';
import {generateDriverLogPrefix} from './helpers';

export class ExtensionCore {
  bidiEventSubs: Record<string, string[]>;
  bidiCommands: BidiModuleMap = BIDI_COMMANDS as BidiModuleMap;
  _logPrefix?: string;
  protected _log: AppiumLogger;
  // used to handle driver events
  readonly eventEmitter: NodeJS.EventEmitter;


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
    const overlappingKeys = _.intersection(Object.keys(cmds), Object.keys(this.bidiCommands));
    if (overlappingKeys.length) {
      this.log.warn(`Overwriting existing bidi modules: ${JSON.stringify(overlappingKeys)}. This may not be intended!`);
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
        `Did not receive a valid BiDi module and method name ` +
          `of the form moduleName.methodName. Instead received ` +
          `'${moduleName}.${methodName}'`,
      );
    }

    // if the command module or method isn't part of our spec, reject
    if (!(this.bidiCommands[moduleName]?.[methodName])) {
      throw new errors.UnknownCommandError();
    }

    const {command} = this.bidiCommands[moduleName][methodName];
    // if the command method isn't part of our spec, also reject
    if (!command) {
      throw new errors.UnknownCommandError();
    }

    // If the driver doesn't have this command, it must not be implemented
    if (!this[command]) {
      throw new errors.NotYetImplementedError();
    }
  }

  async executeBidiCommand(bidiCmd: string, bidiParams: StringRecord, next?: () => Promise<any>, driver?: ExtensionCore): Promise<BiDiResultData> {
    const handlerType = (next && driver) ? 'plugin' : 'driver';
    const [moduleName, methodName] = bidiCmd.split('.');
    this.ensureBidiCommandExists(moduleName, methodName);
    const {command, params} = this.bidiCommands[moduleName][methodName];

    // TODO improve param parsing and error messages along the lines of what we have in the http
    // handlers
    const args: any[] = [];
    if (params?.required?.length) {
      for (const requiredParam of params.required) {
        if (_.isUndefined(bidiParams[requiredParam])) {
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
    const logParams = _.truncate(JSON.stringify(bidiParams), {length: MAX_LOG_BODY_LENGTH});
    this.log.debug(
      `Executing bidi command '${bidiCmd}' with params ${logParams} by passing to ${handlerType} ` +
        `method '${command}'`,
    );
    // call the handler with the signature appropriate to extension type (plugin or driver)
    const response = (next && driver) ? await this[command](next, driver, ...args) : await this[command](...args);
    const finalResponse = _.isUndefined(response) ? {} : response;
    this.log.debug(
      `Responding to bidi command '${bidiCmd}' with ` +
      `${_.truncate(JSON.stringify(finalResponse), {length: MAX_LOG_BODY_LENGTH})}`
    );
    return finalResponse;
  }
}
