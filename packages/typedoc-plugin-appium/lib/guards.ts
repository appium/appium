/**
 * A bunch of type guards. Because here is a place to put all of them.
 * @module
 */

import {
  DeclarationReflection,
  ReflectionType,
  TypeOperatorType,
  TupleType,
  LiteralType,
  ReflectionKind,
  Reflection,
} from 'typedoc';
import {
  NAME_BUILTIN_COMMAND_MODULE,
  NAME_COMMAND,
  NAME_EXECUTE_METHOD_MAP,
  NAME_METHOD_MAP,
  NAME_NEW_METHOD_MAP,
  NAME_PARAMS,
  NAME_PAYLOAD_PARAMS,
} from './converter';
import {
  BaseDriverDeclarationReflection,
  CommandPropDeclarationReflection,
  DeclarationReflectionWithReflectedType,
  ExecMethodDeclarationReflection,
  HTTPMethodDeclarationReflection,
  MethodDefParamNamesDeclarationReflection,
  MethodMapDeclarationReflection,
  MethodDefParamsPropDeclarationReflection,
  PropDeclarationReflection,
  ExecMethodDefParamsPropDeclarationReflection,
} from './converter/types';
import {AllowedHttpMethod, ExecMethodData} from './model';

/**
 * Set of HTTP methods allowed by WebDriver; see {@linkcode AllowedHttpMethod}
 */
const ALLOWED_HTTP_METHODS: Readonly<Set<AllowedHttpMethod>> = new Set([
  'GET',
  'POST',
  'DELETE',
] as const);

/**
 * Type guard for {@linkcode DeclarationReflection}
 * @param value any value
 */
export function isDeclarationReflection(value: any): value is DeclarationReflection {
  return value instanceof DeclarationReflection;
}

/**
 * Type guard for {@linkcode ReflectionType}
 * @param value any value
 */
export function isReflectionType(value: any): value is ReflectionType {
  return value instanceof ReflectionType;
}

/**
 * Type guard for {@linkcode TypeOperatorType}
 * @param value any value
 */
export function isTypeOperatorType(value: any): value is TypeOperatorType {
  return value instanceof TypeOperatorType;
}

/**
 * Type guard for {@linkcode LiteralType}
 * @param value any value
 */
export function isLiteralType(value: any): value is LiteralType {
  return value instanceof LiteralType;
}

/**
 * Type guard for {@linkcode TupleType}
 * @param value any value
 */
export function isTupleType(value: any): value is TupleType {
  return value instanceof TupleType;
}

/**
 * Type guard for a {@linkcode DeclarationReflectionWithReflectedType} corresponding to
 * the `executeMethodMap` static property of an extension class.
 * @param value any
 */
export function isExecMethodDefReflection(value: any): value is ExecMethodDeclarationReflection {
  return (
    isReflectionWithReflectedType(value) &&
    value.name === NAME_EXECUTE_METHOD_MAP &&
    value.flags.isStatic
  );
}

/**
 * Type guard for a {@linkcode MethodDefParamNamesDeclarationReflection} corresponding to a list of required or optional parameters within a command or execute method definition.
 * @param value any value
 */
export function isMethodDefParamNamesDeclarationReflection(
  value: any
): value is MethodDefParamNamesDeclarationReflection {
  return (
    isDeclarationReflection(value) &&
    isTypeOperatorType(value.type) &&
    isTupleType(value.type.target) &&
    value.type.target.elements.every(isLiteralType)
  );
}

/**
 * Type guard for a {@linkcode PropDeclarationReflection} corresponding to some property of a constant object.
 * @param value any value
 */
export function isRoutePropDeclarationReflection(value: any): value is PropDeclarationReflection {
  return isReflectionWithReflectedType(value) && isPropertyKind(value);
}

/**
 * Type guard for a {@linkcode BaseDriverDeclarationReflection} corresponding to the `@appium/base-driver` module (_not_ the class).
 * @param value any value
 */
export function isBaseDriverDeclarationReflection(
  value: any
): value is BaseDriverDeclarationReflection {
  return (
    isDeclarationReflection(value) &&
    value.name === NAME_BUILTIN_COMMAND_MODULE &&
    value.kindOf(ReflectionKind.Module)
  );
}

/**
 * Type guard for a property of an object (a {@linkcode Reflection} having kind {@linkcode ReflectionKind.Property}).
 * @param value any value
 * @returns
 */
export function isPropertyKind(value: any) {
  return value instanceof Reflection && value.kindOf(ReflectionKind.Property);
}

/**
 * Type guard for a {@linkcode MethodMapDeclarationReflection} corresponding to the `newMethodMap` static property of an extension class _or_ the `METHOD_MAP` export within `@appium/base-driver`.
 *
 * Note that the type does not care about the `isStatic` flag, but this guard does.
 * @param value any value
 */
export function isMethodMapDeclarationReflection(
  value: any
): value is MethodMapDeclarationReflection {
  return (
    isReflectionWithReflectedType(value) &&
    ((value.name === NAME_NEW_METHOD_MAP && value.flags.isStatic) || value.name === NAME_METHOD_MAP)
  );
}

/**
 * Type guard for a {@linkcode DeclarationReflectionWithReflectedType} a declaration reflection having a reflection type.
 *
 * I don't know what that means, exactly, but there it is.
 * @param value any value
 */
export function isReflectionWithReflectedType(
  value: any
): value is DeclarationReflectionWithReflectedType {
  return isDeclarationReflection(value) && isReflectionType(value.type);
}

export function isHTTPMethodDeclarationReflection(
  value: any
): value is HTTPMethodDeclarationReflection {
  return (
    isReflectionWithReflectedType(value) &&
    isPropertyKind(value) &&
    isAllowedHTTPMethod(value.originalName)
  );
}

/**
 * Type guard for an {@linkcode AllowedHttpMethod}
 *
 * @param value any value
 */
export function isAllowedHTTPMethod(value: any): value is AllowedHttpMethod {
  return ALLOWED_HTTP_METHODS.has(value);
}

/**
 * Type guard for a {@linkcode CommandPropDeclarationReflection} corresponding to the `command` property of a {@linkcode @appium/types#MethodDef} object contained within a {@linkcode @appium/types#MethodMap}.
 * @param value any value
 */
export function isCommandPropDeclarationReflection(
  value: any
): value is CommandPropDeclarationReflection {
  return isDeclarationReflection(value) && isLiteralType(value.type) && value.name === NAME_COMMAND;
}

/**
 * Type guard for a {@linkcode ExecMethodData} derived from a {@linkcode @appium/types#ExecuteMethodMap} object.
 * @param value any value
 */
export function isExecMethodData(value: any): value is ExecMethodData {
  return value && typeof value === 'object' && value.script;
}

/**
 * Type guard for a {@linkcode MethodDefParamsPropDeclarationReflection} corresponding to the `params` prop of a `MethodDef`
 * @param value any value
 */
export function isMethodDefParamsPropDeclarationReflection(
  value: any
): value is MethodDefParamsPropDeclarationReflection {
  return isReflectionWithReflectedType(value) && value.name === NAME_PARAMS;
}

/**
 * Type guard for a {@linkcode ExecMethodDefParamsPropDeclarationReflection} corresponding to the `payloadParams` prop of an `ExecuteMethodDef`.
 * @param value any value
 */
export function isExecMethodDefParamsPropDeclarationReflection(
  value: any
): value is ExecMethodDefParamsPropDeclarationReflection {
  return isReflectionWithReflectedType(value) && value.name === NAME_PAYLOAD_PARAMS;
}
