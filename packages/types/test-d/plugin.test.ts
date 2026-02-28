import {expectAssignable, expectNotAssignable} from 'tsd';
import type {
  AppiumLogger,
  DriverCommandToPluginCommand,
  ExternalDriver,
  Plugin,
  StringRecord,
  ExecuteMethodMap,
  PluginClass,
  PluginExecuteMethodDef,
  PluginStatic,
  NextPluginCallback,
  PluginCommand,
  DriverCommand,
} from '..';
class TestPlugin implements Plugin {
  public logger: AppiumLogger = {} as AppiumLogger;

  constructor(public readonly name: string, public readonly cliArgs: StringRecord<unknown> = {}) {}

  static executeMethodMap = {
    'test: method': {
      command: 'testMethod',
    },
  } as const satisfies ExecuteMethodMap<TestPlugin>;

  public getPageSource: DriverCommandToPluginCommand<
    ExternalDriver['getPageSource'],
    [flag: boolean],
    string | Buffer
  > = async function (next, driver, flag) {
    const source = await next();
    if (typeof source === 'string') {
      return flag ? source : Buffer.from(source);
    }
    return '';
  };

  public async testMethod(next: NextPluginCallback, driver: ExternalDriver) {
    return driver ? await next() : '';
  }
}

const instance = new TestPlugin('test-plugin');

expectAssignable<Plugin>(instance);
expectAssignable<PluginExecuteMethodDef<TestPlugin>>(TestPlugin.executeMethodMap['test: method']);
expectAssignable<ExecuteMethodMap<TestPlugin>>(TestPlugin.executeMethodMap);
expectAssignable<PluginStatic<TestPlugin>>(TestPlugin);
expectAssignable<PluginClass<TestPlugin>>(TestPlugin);
expectNotAssignable<PluginClass>(TestPlugin);
expectAssignable<PluginCommand>(instance.testMethod);
expectAssignable<PluginCommand>(instance.getPageSource);
// DriverCommand does not know anything about the driver in which it lives, so `getPageSource` looks
// like any other `DriverCommand`; it returns a `Promise`!
expectAssignable<DriverCommand>(instance.getPageSource);
expectAssignable<PluginCommand<ExternalDriver, [flag: boolean], string | Buffer>>(
  TestPlugin.prototype.getPageSource
);
