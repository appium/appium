import {expectAssignable, expectNotAssignable} from 'tsd';

import type {
  Driver,
  DriverExecuteMethodDef,
  ExecuteMethodMap,
  ExternalDriver,
  NextPluginCallback,
  Plugin,
  PluginExecuteMethodDef,
} from '../lib/index.js';

/**
 * A driver with execute methods of various arities. Only the members relevant to the checks
 * below are declared; the rest are stubbed via the intersection with `Driver`.
 */
type TestDriver = Driver & {
  noArgs(): Promise<void>;
  oneRequired(a: string): Promise<void>;
  twoRequiredOneOptional(a: string, b: number, c?: boolean): Promise<void>;
  allOptional(a?: string, b?: number): Promise<void>;
  restArgs(a: string, ...rest: unknown[]): Promise<void>;
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
