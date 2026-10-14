import {BaseDriver} from '@appium/base-driver';
import {expectNotAssignable, expectType} from 'tsd';

const driver = new BaseDriver();
await driver.timeouts(undefined, undefined, null, null, null);
driver.setScriptTimeout(null);
driver.setPageLoadTimeout(null);
driver.setImplicitWait(null);
const timeouts = await driver.getTimeouts();
expectType<number | null>(timeouts.script);
expectType<number | null>(timeouts.pageLoad);
expectType<number | null>(timeouts.implicit);
expectType<number>(timeouts.command);
expectNotAssignable<number>(timeouts.script);
expectNotAssignable<number>(timeouts.pageLoad);
expectNotAssignable<number>(timeouts.implicit);
expectNotAssignable<Parameters<typeof driver.timeouts>[2]>('100');
expectNotAssignable<Parameters<typeof driver.setNewCommandTimeout>[0]>(null);
