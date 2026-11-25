import {expectAssignable, expectDocCommentIncludes, expectNotAssignable} from 'tsd';

import type {
  Constraints,
  Driver,
  DriverClass,
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

type TestDriver = Driver & {
  noArgs(): Promise<void>;
  oneRequired(a: string): Promise<void>;
  oneRequiredNumber(a: number): Promise<void>;
  twoRequiredOneOptional(a: string, b: number, c?: boolean): Promise<void>;
  allOptional(a?: string, b?: number): Promise<void>;
  threeRequired(a: string, b: string, c: string): Promise<void>;
  elementRequiredOnly(a: number, elementId: string): Promise<void>;
  elementWithOptional(a: number, b: number | undefined, elementId: string): Promise<void>;
  elementWithStringOptional(a: number, b: string | undefined, elementId: string): Promise<void>;
  twoTrailingOptionals(a: number, b: number | undefined, c?: string): Promise<void>;
  overloaded(x: string): Promise<void>;
  overloaded(x: number, y: number): Promise<void>;
  overloadedZero(): Promise<void>;
  overloadedZero(x: number): Promise<void>;
  sixOverloads(a: number): Promise<void>;
  sixOverloads(a: number, b: number): Promise<void>;
  sixOverloads(a: number, b: number, c: number): Promise<void>;
  sixOverloads(a: number, b: number, c: number, d: number): Promise<void>;
  sixOverloads(a: number, b: number, c: number, d: number, e: number): Promise<void>;
  sixOverloads(a: number, b: number, c: number, d: number, e: number, f: number): Promise<void>;
  mixedRest(x: number): Promise<void>;
  mixedRest(a: number, b: number, ...rest: unknown[]): Promise<void>;
  mixedCatchAll(x: number): Promise<void>;
  mixedCatchAll(...args: unknown[]): Promise<void>;
  mixedRestOverload(x: undefined): Promise<void>;
  mixedRestOverload(...rest: number[]): Promise<void>;
  optWithRest(a: number, b?: string, ...rest: number[]): Promise<void>;
  optSameTypeWithRest(a: number, b?: number, ...rest: number[]): Promise<void>;
  restArgs(a: string, ...rest: unknown[]): Promise<void>;
  restStrings(a: number, ...rest: string[]): Promise<void>;
  roRest(...rest: readonly number[]): Promise<void>;
  variadicTail(...args: [...number[], boolean]): Promise<void>;
  variadicUrlTail(...args: [...number[], string]): Promise<void>;
  varUndefBool(...args: [...(number | undefined)[], boolean]): Promise<void>;
  varBoolStr(...args: [...number[], boolean, string]): Promise<void>;
  untyped(...args: any[]): Promise<void>;
  unk(a: unknown): Promise<void>;
  anyArg(a: any): Promise<void>;
  unionReq(a: string | number): Promise<void>;
  unionOpt(a: boolean | undefined): Promise<void>;
  litUnion(a: 'x' | 'y'): Promise<void>;
  optionalCmd?: (a: string) => Promise<void>;
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
  overloadedPlugin(next: NextPluginCallback, driver: ExternalDriver, x: string): Promise<void>;
  overloadedPlugin(next: NextPluginCallback, driver: ExternalDriver, x: number, y: number): Promise<void>;
  optionalPluginCmd?: (next: NextPluginCallback, driver: ExternalDriver, a: string) => Promise<void>;
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

type TestMethodDef = DriverMethodDef<TestDriver>;

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
expectAssignable<TestMethodDef>({
  command: 'elementWithOptional',
  payloadParams: {required: ['a', 'b']},
} as const);
expectAssignable<TestMethodDef>({
  command: 'elementWithStringOptional',
  payloadParams: {required: ['a'], optional: ['b']},
} as const);
expectAssignable<TestMethodDef>({command: 'twoTrailingOptionals', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'overloaded'} as const);
expectAssignable<TestMethodDef>({command: 'overloaded', payloadParams: {required: ['x']}} as const);
expectAssignable<TestMethodDef>({command: 'overloaded', payloadParams: {required: ['x', 'y']}} as const);
expectAssignable<TestMethodDef>({
  command: 'overloaded',
  payloadParams: {required: [['x'], ['x', 'y']]},
} as const);
expectAssignable<TestMethodDef>({command: 'overloadedZero'} as const);
expectAssignable<TestMethodDef>({command: 'overloadedZero', payloadParams: {}} as const);
expectAssignable<TestMethodDef>({command: 'overloadedZero', payloadParams: {required: []}} as const);
expectAssignable<TestMethodDef>({command: 'overloadedZero', payloadParams: {required: ['x']}} as const);
expectAssignable<TestMethodDef>({
  command: 'oneRequiredNumber',
  payloadParams: {required: ['x', 'y'], makeArgs: ({x, y}) => [x + y]},
} as const);
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
expectNotAssignable<TestMethodDef>({command: 'elementWithOptional', payloadParams: {required: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'elementWithOptional'} as const);
expectNotAssignable<TestMethodDef>({
  command: 'elementWithStringOptional',
  payloadParams: {required: ['a']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'elementWithOptional',
  payloadParams: {required: ['a', 'b'], optional: ['elementId']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'overloaded',
  payloadParams: {required: ['x', 'y', 'z']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'overloadedZero',
  payloadParams: {required: ['x', 'y']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'noArgs',
  payloadParams: {required: ['x', 'y', 'z'], makeArgs: () => []},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'noArgs',
  payloadParams: {optional: ['x'], makeArgs: () => []},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'noArgs',
  payloadParams: {makeArgs: () => [1]},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'oneRequiredNumber',
  payloadParams: {makeArgs: () => 123},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'oneRequired',
  payloadParams: {required: [['a'], []]},
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

expectNotAssignable<DriverMethodDef<TestDriver>>({
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
const contextuallyTypedMethodMap: MethodMap<TestDriver> = {
  '/test': {
    POST: {command: 'oneRequiredNumber', payloadParams: {required: ['a']}},
    DELETE: {command: 'overloaded', payloadParams: {required: ['x']}},
  },
};
expectAssignable<MethodMap<TestDriver>>(contextuallyTypedMethodMap);
expectNotAssignable<MethodMap<TestDriver>>({
  '/test': {
    POST: {command: 'oneRequiredNumber' as const, payloadParams: {required: ['a', 'b']}},
  },
});

const driverMethodMap = {
  '/test': {
    GET: {command: 'noArgs'},
    POST: {command: 'twoRequiredOneOptional', payloadParams: {required: ['a', 'b'], optional: ['c']}},
  },
} as const satisfies MethodMap<TestDriver>;

expectAssignable<MethodMap<TestDriver>>(driverMethodMap);
expectAssignable<MethodMap<TestDriver, true>>(driverMethodMap);
expectAssignable<MethodMap<Driver>>(driverMethodMap);
expectAssignable<MethodMap<ExternalDriver>>(driverMethodMap);
expectAssignable<MethodMap<TestDriver, true>>({
  '/proxied': {
    GET: {command: 'proxiedCommand'},
    POST: {command: 'anotherProxied', payloadParams: {required: ['x']}},
  },
} as const);
expectNotAssignable<MethodMap<TestDriver, false>>({
  '/proxied': {
    GET: {command: 'proxiedCommand'},
  },
} as const);
expectNotAssignable<MethodMap<TestDriver>>({
  '/proxied': {GET: {command: 'proxiedCommand'}},
} as const);
expectNotAssignable<MethodMap<TestDriver>>({
  '/invalid-params': {POST: {command: 'oneRequiredNumber', payloadParams: {optional: ['a']}}},
} as const);
const nonConstMethodMap = {
  '/test': {GET: {command: 'noArgs'}},
};
expectNotAssignable<MethodMap<TestDriver>>(nonConstMethodMap);
expectAssignable<MethodMap<any>>({
  '/any': {POST: {command: 'whatever', payloadParams: {required: ['a']}}},
} as const);
expectAssignable<DriverMethodDef<ExternalDriver>>({command: 'getPageSource'} as const);

type ExtendedExternalDriver = ExternalDriver & {extra?(a: number): Promise<void>};
expectAssignable<DriverMethodDef<ExtendedExternalDriver>>({command: 'getPageSource'} as const);
expectAssignable<DriverMethodDef<ExtendedExternalDriver>>({
  command: 'extra',
  payloadParams: {required: ['a']},
} as const);
expectNotAssignable<DriverMethodDef<ExtendedExternalDriver>>({command: 'bogus'} as const);
expectNotAssignable<DriverMethodDef<ExtendedExternalDriver>>({command: 'extra'} as const);

type ExtendedBaseDriver = Driver & {extra?(a: number): Promise<void>};
expectAssignable<DriverMethodDef<ExtendedBaseDriver>>({command: 'extra', payloadParams: {required: ['a']}} as const);
expectNotAssignable<DriverMethodDef<ExtendedBaseDriver>>({command: 'bogus'} as const);
expectNotAssignable<DriverMethodDef<ExtendedBaseDriver>>({command: 'extra'} as const);

type TestPluginMethodDef = PluginMethodDef<TestPlugin>;

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
expectAssignable<TestPluginMethodDef>({command: 'handle', payloadParams: {required: ['cmdName']}} as const);

expectNotAssignable<PluginMethodDef<TestPlugin>>({
  command: 'handledCommand',
  payloadParams: {required: ['a']},
} as const);
expectAssignable<PluginMethodDef<TestPlugin, true>>({
  command: 'handledCommand',
  payloadParams: {required: ['a']},
} as const);
expectAssignable<MethodMap<TestPlugin, true>>({
  '/handled': {POST: {command: 'handledCommand', payloadParams: {required: ['x']}}},
} as const);
expectNotAssignable<MethodMap<TestPlugin>>({
  '/handled': {GET: {command: 'handledCommand'}},
} as const);

const pluginMethodMap = {
  '/plugin': {
    POST: {command: 'oneRequiredOneOptional', payloadParams: {required: ['a'], optional: ['b']}},
  },
} as const satisfies MethodMap<TestPlugin>;

expectAssignable<MethodMap<TestPlugin>>(pluginMethodMap);
expectAssignable<MethodMap<TestPlugin, true>>(pluginMethodMap);
expectAssignable<MethodMap<Plugin>>(pluginMethodMap);

type ExtendedPlugin = Plugin & {
  extra?(next: NextPluginCallback, driver: ExternalDriver, a: number): Promise<void>;
};
expectAssignable<PluginMethodDef<ExtendedPlugin>>({command: 'extra', payloadParams: {required: ['a']}} as const);
expectNotAssignable<PluginMethodDef<ExtendedPlugin>>({command: 'bogus'} as const);
expectNotAssignable<PluginMethodDef<ExtendedPlugin>>({command: 'extra'} as const);

expectAssignable<TestMethodDef>({command: 'unk', payloadParams: {optional: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'unk', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'unk'} as const);
expectAssignable<TestMethodDef>({command: 'anyArg', payloadParams: {optional: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'anyArg'} as const);
expectAssignable<TestDef>({command: 'unk', params: {optional: ['a']}} as const);
expectAssignable<TestDef>({command: 'unk', params: {required: ['a']}} as const);
expectAssignable<TestDef>({command: 'unk'} as const);
expectAssignable<TestDef>({command: 'anyArg', params: {optional: ['a']}} as const);
expectAssignable<TestDef>({command: 'unionOpt', params: {optional: ['a']}} as const);
expectAssignable<TestDef>({command: 'unionReq', params: {required: ['a']}} as const);
expectNotAssignable<TestDef>({command: 'unionReq'} as const);
expectNotAssignable<TestDef>({command: 'unionReq', params: {optional: ['a']}} as const);
expectNotAssignable<TestDef>({command: 'restStrings', params: {required: ['a'], optional: ['b']}} as const);

expectAssignable<TestMethodDef>({command: 'optionalCmd', payloadParams: {required: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'optionalCmd', payloadParams: {optional: ['a']}} as const);
expectAssignable<TestPluginMethodDef>({
  command: 'optionalPluginCmd',
  payloadParams: {required: ['a']},
} as const);
expectNotAssignable<TestPluginMethodDef>({
  command: 'optionalPluginCmd',
  payloadParams: {optional: ['a']},
} as const);

expectAssignable<TestMethodDef>({command: 'unionReq', payloadParams: {required: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'unionReq'} as const);
expectNotAssignable<TestMethodDef>({command: 'unionReq', payloadParams: {optional: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'unionOpt', payloadParams: {optional: ['a']}} as const);
expectAssignable<TestMethodDef>({command: 'litUnion', payloadParams: {required: ['a']}} as const);
expectNotAssignable<TestMethodDef>({command: 'litUnion'} as const);
expectNotAssignable<TestMethodDef>({command: 'litUnion', payloadParams: {optional: ['a']}} as const);

expectAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {wrap: 'gesture', required: ['a', 'b'], validate: (obj: any) => Boolean(obj)},
} as const);
expectAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {unwrap: 'data', required: ['a', 'b'], optional: ['c']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'twoRequiredOneOptional',
  payloadParams: {wrap: 'gesture', required: ['a'], validate: () => true},
} as const);

expectAssignable<TestDef>({command: 'overloaded', params: {required: ['x']}} as const);
expectAssignable<TestDef>({command: 'overloaded', params: {required: ['x', 'y']}} as const);
expectNotAssignable<TestDef>({command: 'overloaded'} as const);
expectNotAssignable<TestDef>({command: 'overloaded', params: {required: ['x', 'y', 'z']}} as const);
expectAssignable<TestDef>({command: 'overloadedZero'} as const);
expectAssignable<TestDef>({command: 'overloadedZero', params: {}} as const);
expectAssignable<TestDef>({command: 'overloadedZero', params: {required: ['x']}} as const);
expectAssignable<TestMethodDef>({command: 'sixOverloads', payloadParams: {required: ['a', 'b']}} as const);
expectAssignable<TestMethodDef>({
  command: 'sixOverloads',
  payloadParams: {required: ['a', 'b', 'c', 'd', 'e', 'f']},
} as const);
expectNotAssignable<TestMethodDef>({command: 'sixOverloads', payloadParams: {required: ['a']}} as const);
expectAssignable<DriverMethodDef<TestDriver, true>>({
  command: 'sixOverloads',
  payloadParams: {required: ['a']},
} as const);
expectAssignable<MethodMap<TestDriver, true>>({
  '/six': {POST: {command: 'sixOverloads', payloadParams: {required: ['a']}}},
} as const);

expectAssignable<TestPluginMethodDef>({command: 'overloadedPlugin', payloadParams: {required: ['x']}} as const);
expectAssignable<TestPluginMethodDef>({command: 'overloadedPlugin', payloadParams: {required: ['x', 'y']}} as const);
expectNotAssignable<TestPluginMethodDef>({
  command: 'overloadedPlugin',
  payloadParams: {required: ['x', 'y', 'z']},
} as const);
expectAssignable<TestPluginDef>({command: 'overloadedPlugin', params: {required: ['x']}} as const);
expectAssignable<TestPluginDef>({command: 'overloadedPlugin', params: {required: ['x', 'y']}} as const);
expectNotAssignable<TestPluginDef>({command: 'overloadedPlugin', params: {required: ['x', 'y', 'z']}} as const);

expectAssignable<TestMethodDef>({command: 'mixedRest', payloadParams: {required: ['x']}} as const);
expectAssignable<TestMethodDef>({
  command: 'mixedRest',
  payloadParams: {required: ['a', 'b'], optional: ['c']},
} as const);
expectNotAssignable<TestMethodDef>({command: 'mixedRest'} as const);
expectNotAssignable<TestMethodDef>({
  command: 'mixedRest',
  payloadParams: {required: ['x'], optional: ['y']},
} as const);
expectAssignable<TestDef>({command: 'mixedRest', params: {required: ['x']}} as const);
expectAssignable<TestDef>({
  command: 'mixedRest',
  params: {required: ['a', 'b'], optional: ['c']},
} as const);
expectNotAssignable<TestDef>({command: 'mixedRest'} as const);
expectNotAssignable<TestDef>({command: 'mixedRest', params: {required: ['x'], optional: ['y']}} as const);

expectAssignable<TestMethodDef>({command: 'mixedCatchAll'} as const);
expectAssignable<TestMethodDef>({
  command: 'mixedCatchAll',
  payloadParams: {required: ['a', 'b'], optional: ['c']},
} as const);
expectAssignable<TestDef>({command: 'mixedCatchAll'} as const);
expectAssignable<TestDef>({
  command: 'mixedCatchAll',
  params: {required: ['a', 'b'], optional: ['c']},
} as const);

declare const BaseTestDriver: new () => Driver;
class ImplOverloadDriver extends BaseTestDriver {
  cmd(x: number): Promise<void>;
  cmd(x: number, y: number): Promise<void>;
  async cmd(..._args: unknown[]): Promise<void> {}
}
expectAssignable<DriverMethodDef<ImplOverloadDriver>>({command: 'cmd', payloadParams: {required: ['x']}} as const);
expectNotAssignable<DriverMethodDef<ImplOverloadDriver>>({command: 'cmd'} as const);
expectNotAssignable<DriverMethodDef<ImplOverloadDriver>>({
  command: 'cmd',
  payloadParams: {required: ['x', 'y', 'z']},
} as const);

expectAssignable<MethodMap<TestDriver>>({
  '/no-url-params': {POST: {command: 'threeRequired'}},
} as const);

expectAssignable<DriverMethodDef<Driver>>({command: 'anyCustomCommand'} as const);
expectAssignable<DriverMethodDef<ExternalDriver>>({command: 'anyCustomCommand'} as const);
expectAssignable<PluginMethodDef<Plugin>>({command: 'anyCustomCommand'} as const);
type CustomCapConstraints = {customCap: {isString: true}};
expectAssignable<DriverMethodDef<Driver<CustomCapConstraints>>>({command: 'anyCustomCommand'} as const);
expectAssignable<DriverMethodDef<ExternalDriver<CustomCapConstraints>>>({command: 'anyCustomCommand'} as const);
expectAssignable<DriverMethodDef<Driver | ExternalDriver>>({command: 'anyCustomCommand'} as const);
expectAssignable<DriverMethodDef<Driver<CustomCapConstraints> | ExternalDriver<CustomCapConstraints>>>({
  command: 'anyCustomCommand',
} as const);
expectNotAssignable<DriverExecuteMethodDef<Driver>>({command: 'anyCustomCommand'} as const);
expectNotAssignable<DriverExecuteMethodDef<ExternalDriver>>({command: 'anyCustomCommand'} as const);
expectNotAssignable<DriverExecuteMethodDef<Driver<CustomCapConstraints>>>({command: 'anyCustomCommand'} as const);
expectNotAssignable<DriverExecuteMethodDef<ExternalDriver<CustomCapConstraints>>>({
  command: 'anyCustomCommand',
} as const);
expectNotAssignable<DriverExecuteMethodDef<Driver | ExternalDriver>>({command: 'anyCustomCommand'} as const);
expectNotAssignable<
  PluginExecuteMethodDef<Plugin & {customPluginCmd(next: NextPluginCallback, driver: ExternalDriver): Promise<void>}>
>({command: 'anyCustomCommand'} as const);
expectNotAssignable<DriverMethodDef<Driver | (Driver & {getStatus(a: number): Promise<any>})>>({
  command: 'anyCustomCommand',
} as const);
expectNotAssignable<DriverMethodDef<Driver & {getStatus(a: number): Promise<any>}>>({
  command: 'anyCustomCommand',
} as const);
expectNotAssignable<DriverExecuteMethodDef<Driver & {getStatus(a: number): Promise<any>}>>({
  command: 'anyCustomCommand',
} as const);
declare const ConstrainedBaseDriver: new () => Driver<CustomCapConstraints>;
class ConstrainedDriver extends ConstrainedBaseDriver {
  static baseVersion = '1.0.0';
  static newMethodMap = {
    '/constrained': {GET: {command: 'customCmd'}},
  } as const satisfies MethodMap<ConstrainedDriver>;
  static executeMethodMap = {
    'test: constrained': {command: 'customCmd'},
  } as const satisfies ExecuteMethodMap<ConstrainedDriver>;
  async customCmd(): Promise<void> {}
}
expectAssignable<DriverClass<Driver<CustomCapConstraints>>>(ConstrainedDriver);
declare const ConstrainedExtBaseDriver: new () => ExternalDriver<CustomCapConstraints>;
class ExtSubDriver extends ConstrainedExtBaseDriver {
  static baseVersion = '1.0.0';
  static newMethodMap = {
    '/ext': {GET: {command: 'extCmd'}},
  } as const satisfies MethodMap<ExtSubDriver>;
  static executeMethodMap = {
    'test: ext': {command: 'extCmd'},
  } as const satisfies ExecuteMethodMap<ExtSubDriver>;
  async extCmd(): Promise<void> {}
}
expectAssignable<DriverClass<ExternalDriver>>(ExtSubDriver);
expectAssignable<DriverClass<ExternalDriver<CustomCapConstraints>>>(ExtSubDriver);
expectAssignable<ExecuteMethodMap<ExternalDriver>>(ExtSubDriver.executeMethodMap);

expectAssignable<TestMethodDef>({command: 'mixedRestOverload', payloadParams: {optional: ['a']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'mixedRestOverload',
  payloadParams: {optional: ['a', 'b', 'c']},
} as const);
expectAssignable<TestMethodDef>({command: 'optWithRest', payloadParams: {required: ['a'], optional: ['b']}} as const);
expectAssignable<TestMethodDef>({command: 'optWithRest', payloadParams: {required: ['a', 'b', 'c']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'optWithRest',
  payloadParams: {required: ['a'], optional: ['b', 'c']},
} as const);
expectAssignable<TestMethodDef>({
  command: 'optSameTypeWithRest',
  payloadParams: {required: ['a'], optional: ['b']},
} as const);
expectNotAssignable<TestMethodDef>({
  command: 'optSameTypeWithRest',
  payloadParams: {required: ['a'], optional: ['b', 'c']},
} as const);
expectAssignable<TestMethodDef>({command: 'roRest', payloadParams: {required: ['a', 'b']}} as const);
expectAssignable<TestMethodDef>({command: 'variadicTail', payloadParams: {required: ['b']}} as const);
expectAssignable<TestMethodDef>({command: 'variadicUrlTail'} as const);
expectNotAssignable<TestMethodDef>({command: 'variadicTail'} as const);
expectNotAssignable<TestDef>({command: 'variadicTail'} as const);
expectNotAssignable<TestMethodDef>({command: 'variadicTail', payloadParams: {optional: ['x']}} as const);
expectAssignable<TestMethodDef>({command: 'varBoolStr', payloadParams: {required: ['b']}} as const);
expectNotAssignable<TestDef>({command: 'varBoolStr', params: {required: ['b']}} as const);
expectNotAssignable<TestMethodDef>({
  command: 'varUndefBool',
  payloadParams: {required: ['a'], optional: ['b']},
} as const);
expectNotAssignable<TestDef>({command: 'varUndefBool', params: {required: ['a'], optional: ['b']}} as const);

export function genericMethodMapLookup<C extends Constraints>(d: DriverClass<Driver<C>>, route: string) {
  return d.newMethodMap?.[route]?.GET;
}
export function wrappedGenericMethodLookup(d: DriverClass<Driver<CustomCapConstraints>>, route: string) {
  return genericMethodMapLookup(d, route);
}
export function genericExecMapLookup<C extends Constraints>(d: DriverClass<Driver<C>>, script: string) {
  return d.executeMethodMap?.[script];
}
export function genericExecSpread<C extends Constraints>(d: DriverClass<Driver<C>>, script: string) {
  return {...d.executeMethodMap?.[script]};
}
export function genericMethodSpread<C extends Constraints>(d: DriverClass<Driver<C>>, route: string) {
  return {...d.newMethodMap?.[route]?.GET};
}
export function genericPluginMethodLookup<P extends Plugin>(m: MethodMap<P>, route: string) {
  return m[route]?.GET;
}
export function genericPluginExecSpread<P extends Plugin>(m: ExecuteMethodMap<P>, script: string) {
  return {...m[script]};
}
expectAssignable<DriverMethodDef<Driver<CustomCapConstraints>> | undefined>(
  genericMethodMapLookup(ConstrainedDriver, '/constrained'),
);
expectAssignable<ExecuteMethodMap<Driver<CustomCapConstraints>>[string] | undefined>(
  genericExecMapLookup(ConstrainedDriver, 'test: constrained'),
);
expectAssignable<{command?: string}>(genericExecSpread(ConstrainedDriver, 'test: constrained'));
expectAssignable<{command?: string}>(genericMethodSpread(ConstrainedDriver, '/constrained'));

declare const strictDriverDef: Extract<TestMethodDef, {readonly command: 'oneRequiredNumber'}>;
declare const optionalPayloadDriverDef: Extract<TestMethodDef, {readonly command: 'noArgs'}>;
declare const looseDriverDef: DriverMethodDef<TestDriver, true>;
declare const strictPluginDef: Extract<TestPluginMethodDef, {readonly command: 'oneRequiredNumber'}>;
expectDocCommentIncludes<'Name of the command.'>(strictDriverDef.command);
expectDocCommentIncludes<'Specifies shape of payload'>(strictDriverDef.payloadParams);
expectDocCommentIncludes<'Specifies shape of payload'>(optionalPayloadDriverDef.payloadParams);
expectDocCommentIncludes<'Name of the command.'>(looseDriverDef.command);
expectDocCommentIncludes<'Specifies shape of payload'>(looseDriverDef.payloadParams);
expectDocCommentIncludes<'Name of the command.'>(strictPluginDef.command);
expectDocCommentIncludes<'Specifies shape of payload'>(strictPluginDef.payloadParams);
