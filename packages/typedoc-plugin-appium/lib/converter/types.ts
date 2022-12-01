import {Merge} from 'type-fest';
import {
  DeclarationReflection,
  LiteralType,
  ReflectionKind,
  ReflectionType,
  SomeType,
  TupleType,
  TypeOperatorType,
} from 'typedoc';
import {AllowedHttpMethod} from '../model';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_METHOD_MAP, NAME_NEW_METHOD_MAP} from './converter';

/**
 * Type corresponding to a reflection of a {@linkcode @appium/types#MethodMap}
 */
export type MethodMapDeclarationReflection = Merge<
  DeclarationReflectionWithReflectedType,
  {name: typeof NAME_METHOD_MAP | typeof NAME_NEW_METHOD_MAP}
>;

/**
 * Type corresponding to a reflection of {@linkcode @appium/base-driver}
 */
export type BaseDriverDeclarationReflection = Merge<
  DeclarationReflection,
  {
    name: typeof NAME_BUILTIN_COMMAND_MODULE;
    kind: ReflectionKind.Module;
  }
>;

/**
 * Utility to narrow a declaration reflection to a specific `SomeType`
 */
type WithSomeType<
  T extends SomeType,
  R extends DeclarationReflection = DeclarationReflection
> = Merge<R, {type: T}>;

/**
 * Utility; a TupleType with literal elements
 */
type TupleTypeWithLiteralElements = Merge<TupleType, {elements: LiteralType[]}>;

/**
 * Type for the parameters of a command definition or execute method definition.
 *
 * Node that merging `TypeOperatorType` won't work because it will no longer satisfy `SomeType`, because `SomeType` is a finite collection.
 */
export type MethodDefParamsDeclarationReflection = WithSomeType<
  TypeOperatorType & {operator: 'readonly'; target: TupleTypeWithLiteralElements}
>;

/**
 * Narrows a declaration reflection to one having a reflection type and a property kind. Generic
 */
export type PropDeclarationReflection = Merge<
  DeclarationReflectionWithReflectedType,
  {kind: ReflectionKind.Property}
>;

/**
 * A type corresponding to the HTTP method of a route, which is a property off of the object with the route name in a `MethodMap`
 */
export type HTTPMethodDeclarationReflection = Merge<
  PropDeclarationReflection,
  {originalName: AllowedHttpMethod}
>;

/**
 * A declaration reflection having a reflection type. Generic
 */
export type DeclarationReflectionWithReflectedType = WithSomeType<ReflectionType>;

/**
 * Type corresponding to the value of the `command` property within a `MethodDef`, which must be a type literal.
 */
export type CommandPropDeclarationReflection = WithSomeType<LiteralType>;

/**
 * A generic type guard
 */
export type Guard<T> = (value: any) => value is T;
