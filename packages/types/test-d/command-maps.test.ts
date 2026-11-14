import {expectAssignable, expectNotAssignable} from 'tsd';

import type {
  Driver,
  DriverExecuteMethodDef,
  DriverMethodDef,
  ExecuteMethodMap,
  ExternalDriver,
  MethodMap,
  NextPluginCallback,
  Plugin,
  PluginExecuteMethodDef,
  PluginMethodDef,
} from '../lib/index.js';

/**
 * A driver with execute and protocol methods of various arities. Only the members relevant to the
 * checks below are declared; the rest are stubbed via the intersection with `Driver`.
 */
type TestDriver = Driver & {
  noArgs(): Promise<void>;
  oneRequired(a: string): Promise<void>;
  oneRequiredNumber(a: number): Promise<void>;
  twoRequiredOneOptional(a: string, b: number, c?: boolean): Promise<void>;
  allOptional(a?: string, b?: number): Promise<void>;
  threeRequired(a: string, b: string, c: string): Promise<void>;
  elementRequiredOnly(a: number, elementId: string): Promise<void>;
  elementWithOptional(a: number, b: number | undefined, elementId: string): Promise<void>;
  restArgs(a: string, ...rest: unknown[]): Promise<void>;
  restStrings(a: number, ...rest: string[]): Promise<void>;
  untyped(...args: any[]): Promise<void>;
  notACommand: string;
};

type TestDef = DriverExecuteMethodDef<TestDriver>;

// matching params
expectAssignable<TestDef>({command: 'noArgs'} as const);
expectAssignable<TestDef>({command: 'noArgs', params: {}} as const);
expectAssignable<TestDef>({command: 'noArgs', params: {required: [], optional: []}} as const);
expectAssignable<TestDef>({command: 'oneRequired', params: {required: ['a']}} as const);
expectAssignable<TestDef>({
  command: 'twoRequiredOneOptional',
  params: {required: ['a', 'b'], optional: ['c']},
} as const);
// an optional method parameter may be mapped to a required param
expectAssignable<TestDef>({command: 'twoRequiredOneOptional', params: {required: ['a', 'b', 'c']}} as const);
// ...or omitted entirely
expectAssignable<TestDef>({command: 'twoRequiredOneOptional', params: {required: ['a', 'b']}} as const);
expectAssignable<TestDef>({command: 'allOptional'} as const);
expectAssignable<TestDef>({command: 'allOptional', params: {optional: ['a', 'b']}} as const);
expectAssignable<TestDef>({command: 'allOptional', params: {required: ['a'], optional: ['b']}} as const);
expectAssignable<TestDef>({command: 'restArgs', params: {required: ['a', 'b', 'c'], optional: ['d', 'e']}} as const);
expectAssignable<TestDef>({command: 'untyped', params: {optional: ['a', 'b', 'c', 'd']}} as const);
expectAssignable<TestDef>({command: 'oneRequired', params: {required: ['a']}, deprecated: true, info: 'x'} as const);

// too few required params
expectNotAssignable<TestDef>({command: 'oneRequired'} as const);
expectNotAssignable<TestDef>({command: 'oneRequired', params: {optional: ['a']}} as const);
expectNotAssignable<TestDef>({
  command: 'twoRequiredOneOptional',
  params: {required: ['a'], optional: ['b', 'c']},
} as const);
// too many params
expectNotAssignable<TestDef>({command: 'noArgs', params: {required: ['a']}} as const);
expectNotAssignable<TestDef>({command: 'noArgs', params: {optional: ['a']}} as const);
expectNotAssignable<TestDef>({command: 'oneRequired', params: {required: ['a', 'b']}} as const);
expectNotAssignable<TestDef>({
  command: 'twoRequiredOneOptional',
  params: {required: ['a', 'b'], optional: ['c', 'd']},
} as const);
expectNotAssignable<TestDef>({command: 'allOptional', params: {optional: ['a', 'b', 'c']}} as const);
// rest params still require the leading required ones
expectNotAssignable<TestDef>({command: 'restArgs', params: {optional: ['a']}} as const);
// unknown or non-command members
expectNotAssignable<TestDef>({command: 'doesNotExist'} as const);
expectNotAssignable<TestDef>({command: 'notACommand'} as const);

// maps which are not declared `as const` cannot be checked, but are still accepted
expectAssignable<TestDef>({command: 'oneRequired', params: {required: ['a', 'b']}});
expectAssignable<TestDef>({command: 'noArgs', params: {optional: ['a']}});

// whole maps
expectAssignable<ExecuteMethodMap<TestDriver>>({
  'test: noArgs': {command: 'noArgs'},
  'test: twoRequiredOneOptional': {
    command: 'twoRequiredOneOptional',
    params: {required: ['a', 'b'], optional: ['c']},
  },
} as const);
expectNotAssignable<ExecuteMethodMap<TestDriver>>({
  'test: noArgs': {command: 'noArgs'},
  'test: twoRequiredOneOptional': {
    command: 'twoRequiredOneOptional',
    params: {required: ['a'], optional: ['b', 'c']},
  },
} as const);

// `any` drivers accept any command and params
expectAssignable<ExecuteMethodMap<any>>({
  'test: whatever': {command: 'whatever', params: {required: ['a'], optional: ['b']}},
} as const);
expectAssignable<DriverExecuteMethodDef<ExternalDriver>>({command: 'getPageSource'} as const);

// plugins: `next` and `driver` are not counted
type TestPlugin = Plugin & {
  noArgs(next: NextPluginCallback, driver: ExternalDriver): Promise<void>;
  oneRequiredOneOptional(next: NextPluginCallback, driver: ExternalDriver, a: string, b?: number): Promise<void>;
  oneRequiredNumber(next: NextPluginCallback, driver: ExternalDriver, a: number): Promise<void>;
};
type TestPluginDef = PluginExecuteMethodDef<TestPlugin>;

expectAssignable<TestPluginDef>({command: 'noArgs'} as const);
expectAssignable<TestPluginDef>({
  command: 'oneRequiredOneOptional',
  params: {required: ['a'], optional: ['b']},
} as const);
expectAssignable<TestPluginDef>({command: 'oneRequiredOneOptional', params: {required: ['a', 'b']}} as const);
expectNotAssignable<TestPluginDef>({command: 'noArgs', params: {required: ['a']}} as const);
expectNotAssignable<TestPluginDef>({command: 'oneRequiredOneOptional', params: {optional: ['a', 'b']}} as const);
expectNotAssignable<TestPluginDef>({command: 'oneRequiredOneOptional', params: {required: ['a', 'b', 'c']}} as const);
expectNotAssignable<TestPluginDef>({command: 'handle'} as const);
expectAssignable<ExecuteMethodMap<TestPlugin>>({
  'test: one': {command: 'oneRequiredOneOptional', params: {required: ['a'], optional: ['b']}},
} as const);

// MethodMap / DriverMethodDef checks (opt-in strict via D = false / Strict = true)
type TestMethodDef = DriverMethodDef<TestDriver, false>;

expectAssignable<TestMethodDef>({} as const);
expectAssignable<TestMethodDef>({neverProxy: true} as const);
expectAssignable<TestMethodDef>({command: 'noArgs'} as const);
expectAssignable<TestMethodDef>({command: 'noArgs', payloadParams: {}} as const);
expectAssignable<TestMethodDef>({command: 'noArgs', payloadParams: {required: []}} as const);
expectAssignable<TestMethodDef>({command: 'noArgs', payloadParams: {makeArgs: () => []}} as const);
expectAssignable<TestMethodDef>({command: 'oneRequired'} as const);
expectAssignable<TestMethodDef>({command: 'oneRequired', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'oneRequired', payloadParams: {required: [['a'], ['b']]}} as const);
expectAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {required: [['a'], ['b']]}} as const);
expectAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {makeArgs: () => [1]}} as const);
expectAssignable<TestMethodDef>({command: 'twoRequiredOneOptional', payloadParams: {required: ['a', 'b']}} as const);
expectAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {required: ['a', 'b'], optional: ['c']},
} as const);
expectAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {required: ['a', 'b', 'c']},
} as const);
expectAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {
    required: [
      ['a', 'b'],
      ['a', 'c'],
    ],
  },
} as const);
expectAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {
    required: [
      ['a', 'b'],
      ['a', 'b', 'c'],
    ],
  },
} as const);
expectAssignable<TestMethodDef>({command: 'allOptional'} as const);
expectAssignable<TestMethodDef>({command: 'allOptional', payloadParams: {optional: ['a', 'b']}} as const);
expectAssignable<TestMethodDef>({command: 'allOptional', payloadParams: {required: ['a'], optional: ['b']}} as const);
expectAssignable<TestMethodDef>({command: 'threeRequired'} as const);
expectAssignable<TestMethodDef>({command: 'threeRequired', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'elementRequiredOnly', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({
  command: 'elementRequiredOnly',
  payloadParams: {required: ['a', 'elementId']},
} as const);
expectAssignable<TestMethodDef>({
  command: 'elementWithOptional',
  payloadParams: {required: ['a'], optional: ['b']},
} as const);
expectAssignable<TestMethodDef>({command: 'elementWithOptional', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'restArgs'} as const);
expectAssignable<TestMethodDef>({
  command: 'restArgs',
  payloadParams: {required: ['a', 'b', 'c'], optional: ['d', 'e']},
} as const);
expectAssignable<TestMethodDef>({
  command: 'restArgs',
  payloadParams: {required: [['a', 'b'], ['a']], optional: ['c']},
} as const);
expectAssignable<TestMethodDef>({command: 'restStrings', payloadParams: {required: ['a', 'b']}} as const);
expectAssignable<TestMethodDef>({command: 'untyped', payloadParams: {optional: ['a', 'b', 'c']}} as const);
expectAssignable<TestMethodDef>({command: 'untyped', payloadParams: {required: [['a'], ['b', 'c']]}} as const);

expectNotAssignable<TestMethodDef>({command: 'noArgs', payloadParams: {required: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'noArgs', payloadParams: {optional: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'noArgs', payloadParams: {required: [['a']]}} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequired', payloadParams: {optional: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequired', payloadParams: {required: ['a', 'b']}} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequiredNumber'} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {}} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {required: []}} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {optional: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {required: ['a', 'b']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'oneRequiredNumber',
  payloadParams: {required: [['a', 'b'], ['c']]},
} as const);
expectNotAssignable<TestMethodDef>({command: 'twoRequiredOneOptional'} as const);
expectNotAssignable<TestMethodDef>({command: 'twoRequiredOneOptional', payloadParams: {required: ['a']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {required: ['a'], optional: ['b', 'c']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {required: ['a', 'b'], optional: ['c', 'd']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {required: [['a'], ['b', 'c']]},
} as const);
expectNotAssignable<TestMethodDef>({command: 'allOptional', payloadParams: {optional: ['a', 'b', 'c']}} as const);
expectNotAssignable<TestMethodDef>({command: 'threeRequired', payloadParams: {optional: ['a']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'threeRequired',
  payloadParams: {required: ['a', 'b', 'c', 'd']},
} as const);
expectNotAssignable<TestMethodDef>({command: 'elementRequiredOnly'} as const);
expectNotAssignable<TestMethodDef>({
  command: 'elementRequiredOnly',
  payloadParams: {required: ['a'], optional: ['opt']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'elementWithOptional',
  payloadParams: {required: ['a', 'b'], optional: ['elementId']},
} as const);
expectNotAssignable<TestMethodDef>({command: 'restArgs', payloadParams: {optional: ['a']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'restArgs',
  payloadParams: {required: [['a'], []], optional: ['b']},
} as const);
expectNotAssignable<TestMethodDef>({command: 'restStrings'} as const);
expectNotAssignable<TestMethodDef>({
  command: 'restStrings',
  payloadParams: {required: ['a'], optional: ['b']},
} as const);
expectNotAssignable<TestMethodDef>({command: 'doesNotExist'} as const);
expectNotAssignable<TestMethodDef>({command: 'notACommand'} as const);

// Backwards-compatible defaults allow proxied commands; strict mode also accepts non-const arrays
expectAssignable<DriverMethodDef<TestDriver>>({
  command: 'anyCustomCommand',
  payloadParams: {required: ['a', 'b']},
} as const);
expectAssignable<DriverMethodDef<TestDriver, true>>({
  command: 'anyCustomCommand',
  payloadParams: {required: ['a', 'b']},
} as const);
expectAssignable<DriverMethodDef<TestDriver, boolean>>({
  command: 'anyCustomCommand',
  payloadParams: {required: ['a', 'b']},
} as const);
expectAssignable<TestMethodDef>({command: 'oneRequiredNumber', payloadParams: {required: ['a', 'b']}});
expectAssignable<TestMethodDef>({command: 'twoRequiredOneOptional', payloadParams: {required: [['a']]}});

const driverMethodMap = {
  '/test': {
    GET: {command: 'noArgs'},
    POST: {command: 'twoRequiredOneOptional', payloadParams: {required: ['a', 'b'], optional: ['c']}},
  },
} as const satisfies MethodMap<TestDriver, true>;

expectAssignable<MethodMap<TestDriver, true>>(driverMethodMap);
expectAssignable<MethodMap<TestDriver>>(driverMethodMap);
expectAssignable<MethodMap<Driver>>(driverMethodMap);
expectAssignable<MethodMap<ExternalDriver>>(driverMethodMap);
expectAssignable<MethodMap<TestDriver>>({
  '/proxied': {
    GET: {command: 'proxiedCommand'},
    POST: {command: 'anotherProxied', payloadParams: {required: ['x']}},
  },
} as const);
expectNotAssignable<MethodMap<TestDriver, true>>({
  '/proxied': {GET: {command: 'proxiedCommand'}},
} as const);
expectNotAssignable<MethodMap<TestDriver, true>>({
  '/invalid-params': {POST: {command: 'oneRequiredNumber', payloadParams: {optional: ['a']}}},
} as const);
expectAssignable<MethodMap<any, true>>({
  '/any': {POST: {command: 'whatever', payloadParams: {required: ['a']}}},
} as const);
expectAssignable<DriverMethodDef<ExternalDriver, false>>({command: 'getPageSource'} as const);

// PluginMethodDef / MethodMap<Plugin> checks
type TestPluginMethodDef = PluginMethodDef<TestPlugin, false>;

expectAssignable<TestPluginMethodDef>({} as const);
expectAssignable<TestPluginMethodDef>({command: 'noArgs'} as const);
expectAssignable<TestPluginMethodDef>({
  command: 'oneRequiredOneOptional',
  payloadParams: {required: ['a'], optional: ['b']},
} as const);
expectAssignable<TestPluginMethodDef>({
  command: 'oneRequiredOneOptional',
  payloadParams: {required: [['a'], ['a', 'b']]},
} as const);
expectAssignable<TestPluginMethodDef>({command: 'oneRequiredOneOptional'} as const);
expectNotAssignable<TestPluginMethodDef>({command: 'oneRequiredNumber'} as const);
expectAssignable<TestPluginMethodDef>({command: 'oneRequiredNumber', payloadParams: {required: ['a']}} as const);
expectNotAssignable<TestPluginMethodDef>({
  command: 'oneRequiredOneOptional',
  payloadParams: {optional: ['a', 'b']},
} as const);
expectNotAssignable<TestPluginMethodDef>({
  command: 'oneRequiredOneOptional',
  payloadParams: {required: ['a', 'b', 'c']},
} as const);
expectNotAssignable<TestPluginMethodDef>({command: 'handle'} as const);

expectAssignable<PluginMethodDef<TestPlugin>>({
  command: 'handledCommand',
  payloadParams: {required: ['a']},
} as const);
expectAssignable<MethodMap<TestPlugin>>({
  '/handled': {POST: {command: 'handledCommand', payloadParams: {required: ['x']}}},
} as const);
expectNotAssignable<MethodMap<TestPlugin, true>>({
  '/handled': {GET: {command: 'handledCommand'}},
} as const);

const pluginMethodMap = {
  '/plugin': {
    POST: {command: 'oneRequiredOneOptional', payloadParams: {required: ['a'], optional: ['b']}},
  },
} as const satisfies MethodMap<TestPlugin, true>;

expectAssignable<MethodMap<TestPlugin, true>>(pluginMethodMap);
expectAssignable<MethodMap<TestPlugin>>(pluginMethodMap);
expectAssignable<MethodMap<Plugin>>(pluginMethodMap);
