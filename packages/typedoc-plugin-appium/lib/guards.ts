import {
  DeclarationReflection,
  ReflectionType,
  TypeOperatorType,
  TupleType,
  LiteralType,
  IntrinsicType,
} from 'typedoc';

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
