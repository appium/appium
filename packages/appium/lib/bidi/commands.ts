import type {ExtensionCore} from '@appium/base-driver';
import {checkParams, errors} from '@appium/base-driver';
import {util} from '@appium/support';
import type {
  BiDiResultData,
  ErrorBiDiCommandResponse,
  IBidiCommands,
  StringRecord,
  SuccessBiDiCommandResponse,
} from '@appium/types';

import type {AppiumDriver} from '../appium.js';
import {MAX_LOGGED_DATA_LENGTH, SESSION_SUBSCRIBE, SESSION_UNSUBSCRIBE} from './constants.js';
import type {BidiProxyClient} from './proxy-client.js';
import type {AnyDriver, ExtensionPlugin} from './types.js';

/**
 * @param data
 * @param driver
 * @param plugins
 * @param bidiProxyClient - when set, the driver is proxying bidi commands to an upstream server;
 * the base (innermost) handler forwards through it instead of calling a local driver method.
 */
export async function onBidiMessage(
  this: AppiumDriver,
  data: Buffer,
  driver: AnyDriver,
  plugins: ExtensionPlugin[],
  bidiProxyClient: BidiProxyClient | null = null,
): Promise<SuccessBiDiCommandResponse | ErrorBiDiCommandResponse> {
  let resMessage: SuccessBiDiCommandResponse | ErrorBiDiCommandResponse;
  let id: number = 0;
  const driverLog = driver.log;
  const dataTruncated = util.truncateString(data.toString(), {length: MAX_LOGGED_DATA_LENGTH});
  try {
    let method: string;
    let params: StringRecord;
    try {
      ({id, method, params} = JSON.parse(data.toString('utf8')));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new errors.InvalidArgumentError(`Could not parse Bidi command '${dataTruncated}': ${message}`);
    }
    driverLog.info(`--> BIDI message #${id}`);
    if (!method) {
      throw new errors.InvalidArgumentError(`Missing method for BiDi operation in '${dataTruncated}'`);
    }
    if (!params) {
      throw new errors.InvalidArgumentError(`Missing params for BiDi operation in '${dataTruncated}`);
    }
    const baseHandler = bidiProxyClient
      ? buildProxyBidiBaseHandler(driver as ExtensionCore, bidiProxyClient, method, params)
      : undefined;
    const executeWrappedCommand = wrapCommandWithPlugins(driver as ExtensionCore, plugins, method, params, baseHandler);
    const result = await executeWrappedCommand();
    resMessage = {
      id,
      type: 'success',
      result,
    };
  } catch (err) {
    if (
      err !== null &&
      typeof err === 'object' &&
      'bidiErrObject' in err &&
      typeof (err as {bidiErrObject: unknown}).bidiErrObject === 'function'
    ) {
      resMessage = (err as {bidiErrObject: (msgId: number) => ErrorBiDiCommandResponse}).bidiErrObject(id);
    } else {
      resMessage = {
        id,
        type: 'error',
        error: errors.UnknownError.error(),
        message: err instanceof Error ? err.message : String(err),
        stacktrace: err instanceof Error ? err.stack : undefined,
      };
    }
  }
  driverLog.info(`<-- BIDI message #${id}`);
  return resMessage;
}

function wrapCommandWithPlugins(
  driver: ExtensionCore,
  plugins: ExtensionCore[],
  method: string,
  params: StringRecord,
  baseHandler: () => Promise<BiDiResultData> = async () => await driver.executeBidiCommand(method, params),
): () => Promise<BiDiResultData> {
  const [moduleName, methodName] = method.split('.');
  let next = baseHandler;
  for (const plugin of plugins.filter((p) => p.doesBidiCommandExist(moduleName, methodName))) {
    next = (
      (_next) => async () =>
        await plugin.executeBidiCommand(method, params, _next, driver)
    )(next);
  }
  return next;
}

/**
 * The base (innermost) bidi command handler used when the driver is proxying bidi commands to an
 * upstream server. Unlike {@link ExtensionCore.executeBidiCommand}, this does not require a
 * local handler method to exist for the command -- it forwards to the upstream server, and only
 * validates params locally when the command is one Appium's canonical bidi command map (or the
 * driver's own registered commands) recognizes. Unknown/vendor modules pass through
 * permissively, so a real upstream implementation can support commands Appium has no static
 * knowledge of.
 */
function buildProxyBidiBaseHandler(
  driver: ExtensionCore & Partial<IBidiCommands>,
  bidiProxyClient: BidiProxyClient,
  method: string,
  params: StringRecord,
): () => Promise<BiDiResultData> {
  return async () => {
    const [moduleName, methodName] = method.split('.');
    if (!moduleName || !methodName) {
      throw new errors.UnknownCommandError(
        `Did not receive a valid BiDi module and method name of the form moduleName.methodName. ` +
          `Instead received '${moduleName}.${methodName}'`,
      );
    }
    const known = driver.bidiCommands[moduleName]?.[methodName];
    if (known?.params) {
      checkParams(known.params, params, {ensureSessionArgs: false});
    }
    const result = await bidiProxyClient.executeCommand(method, params);
    // Keep Appium's local bidiEventSubs bookkeeping in sync, since the event dispatcher's
    // send-gate relies on it uniformly for both locally-emitted and proxied events.
    if (method === SESSION_SUBSCRIBE && typeof driver.bidiSubscribe === 'function') {
      await driver.bidiSubscribe(params.events, params.contexts);
    } else if (method === SESSION_UNSUBSCRIBE && typeof driver.bidiUnsubscribe === 'function') {
      await driver.bidiUnsubscribe(params.events, params.contexts);
    }
    return result;
  };
}
