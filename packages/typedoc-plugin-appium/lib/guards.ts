import {
  DeclarationReflection,
  ReflectionType,
  TypeOperatorType,
  TupleType,
  LiteralType,
  IntrinsicType,
  ReflectionKind,
  Reflection,
} from 'typedoc';
import {
  NAME_BUILTIN_COMMAND_MODULE,
  NAME_EXECUTE_METHOD_MAP,
  NAME_METHOD_MAP,
  NAME_NEW_METHOD_MAP,
} from './converter';
import {
  BaseDriverDeclarationReflection,
  CommandPropDeclarationReflection,
  DeclarationReflectionWithReflectedType,
  HTTPMethodDeclarationReflection,
  MethodDefParamsDeclarationReflection,
  MethodMapDeclarationReflection,
  RoutePropDeclarationReflection,
} from './converter/types';
import {AllowedHttpMethod} from './model';

export function isDeclarationReflection(value: any): value is DeclarationReflection {
  return value instanceof DeclarationReflection;
}
export function isReflectionType(value: any): value is ReflectionType {
  return value instanceof ReflectionType;
}
export function isTypeOperatorType(value: any): value is TypeOperatorType {
  return value instanceof TypeOperatorType;
}
export function isLiteralType(value: any): value is LiteralType {
  return value instanceof LiteralType;
}
export function isIntrinsicType(value: any): value is IntrinsicType {
  return value instanceof IntrinsicType;
}
export function isTupleType(value: any): value is TupleType {
  return value instanceof TupleType;
}

export function isExecMethodDefReflection(
  value: any
): value is DeclarationReflectionWithReflectedType {
  return (
    isReflectionWithReflectedType(value) &&
    value.name === NAME_EXECUTE_METHOD_MAP &&
    value.flags.isStatic
  );
}

export function isParamsArray(value: any): value is MethodDefParamsDeclarationReflection {
  return (
    isDeclarationReflection(value) &&
    isTypeOperatorType(value.type) &&
    isTupleType(value.type.target) &&
    value.type.target.elements.every(isLiteralType)
  );
}

export function isRoutePropDeclarationReflection(
  value: any
): value is RoutePropDeclarationReflection {
  return isReflectionWithReflectedType(value) && isPropertyKind(value);
}

export function isBaseDriverDeclarationReflection(
  value: any
): value is BaseDriverDeclarationReflection {
  return (
    isDeclarationReflection(value) &&
    value.name === NAME_BUILTIN_COMMAND_MODULE &&
    value.kindOf(ReflectionKind.Module)
  );
}

export function isPropertyKind(value: any) {
  return value instanceof Reflection && value.kindOf(ReflectionKind.Property);
}

export function isMethodMapDeclarationReflection(
  value: any
): value is MethodMapDeclarationReflection {
  return (
    isReflectionWithReflectedType(value) &&
    ((value.name === NAME_NEW_METHOD_MAP && value.flags.isStatic) || value.name === NAME_METHOD_MAP)
  );
}

export function isReflectionWithReflectedType(
  value: any
): value is DeclarationReflectionWithReflectedType {
  return isDeclarationReflection(value) && isReflectionType(value.type);
}

const ALLOWED_HTTP_METHODS = Object.freeze(new Set(['GET', 'POST', 'DELETE']));
export function isHTTPMethodDeclarationReflection(
  value: any
): value is HTTPMethodDeclarationReflection {
  return (
    isReflectionWithReflectedType(value) &&
    isPropertyKind(value) &&
    isAllowedHTTPMethod(value.originalName)
  );
}

export function isAllowedHTTPMethod(value: any): value is AllowedHttpMethod {
  return ALLOWED_HTTP_METHODS.has(value);
}

export function isCommandPropDeclarationReflection(
  value: any
): value is CommandPropDeclarationReflection {
  return isDeclarationReflection(value) && isLiteralType(value.type);
}
