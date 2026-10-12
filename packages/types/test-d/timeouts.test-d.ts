import type {ITimeoutCommands} from '@appium/types';
import {expectAssignable, expectNotAssignable, expectType} from 'tsd';

declare const driver: ITimeoutCommands;
await driver.timeouts(undefined, undefined, null, null, null);
driver.setScriptTimeout(null);
driver.setPageLoadTimeout(null);
driver.setImplicitWait(null);
const timeouts = await driver.getTimeouts();
expectType<number | null>(timeouts.script);
expectType<number | null>(timeouts.pageLoad);
expectType<number | null>(timeouts.implicit);
expectType<number>(timeouts.command);
expectAssignable<Awaited<ReturnType<ITimeoutCommands['getTimeouts']>>>({
  script: null,
  pageLoad: null,
  implicit: null,
  command: 0,
});
expectNotAssignable<number>(timeouts.script);
expectNotAssignable<number>(timeouts.pageLoad);
expectNotAssignable<number>(timeouts.implicit);
expectNotAssignable<Parameters<typeof driver.setNewCommandTimeout>[0]>(null);
