import {
  Comment,
  DeclarationReflection,
  LiteralType,
  ReferenceType,
  ReflectionFlags,
  ReflectionKind,
  ReflectionType,
  SignatureReflection,
  SomeType,
  TupleType,
  TypeOperatorType,
} from 'typedoc';
import {AllowedHttpMethod, ParentReflection} from '../model';
import {NAME_EXTERNAL_DRIVER, NAME_TYPES_MODULE} from './builtin-external-driver';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_METHOD_MAP} from './builtin-method-map';
import {NAME_NEW_METHOD_MAP, NAME_EXECUTE_METHOD_MAP, NAME_PARAMS} from './external';

type WithName<S extends string, R> = R & {
  name: S;
};

type WithKind<K extends ReflectionKind, R> = R & {kind: K};

/**
 * Utility to narrow a declaration reflection to a specific `SomeType`
 */
type WithSomeType<T extends SomeType, R> = R & {type: T};

type WithNameAndKind<S extends string, K extends ReflectionKind, R> = R & {name: S; kind: K};

/**
 * Utility; a TupleType with literal elements
 */
export type TupleTypeWithLiteralElements = TupleType & {elements: LiteralType[]};

/**
 * Type corresponding to a reflection of a {@linkcode @appium/types#MethodMap}
 */
export type MethodMapDeclarationReflection = WithName<
  typeof NAME_METHOD_MAP | typeof NAME_NEW_METHOD_MAP,
  DeclarationReflectionWithReflectedType
>;

/**
 * Type corresponding to a reflection of {@linkcode @appium/base-driver}
 */
export type BaseDriverDeclarationReflection = WithNameAndKind<
  typeof NAME_BUILTIN_COMMAND_MODULE,
  ReflectionKind.Module,
  DeclarationReflection
>;

/**
 * Type for the parameters of a command definition or execute method definition.
 *
 * Node that merging `TypeOperatorType` won't work because it will no longer satisfy `SomeType`, because `SomeType` is a finite collection.
 */
export type MethodDefParamNamesDeclarationReflection = WithSomeType<
  TypeOperatorTypeWithTupleTypeWithLiteralElements,
  DeclarationReflection
>;

export type TypeOperatorTypeWithTupleTypeWithLiteralElements = TypeOperatorType & {
  operator: 'readonly';
  target: TupleTypeWithLiteralElements;
};

/**
 * Narrows a declaration reflection to one having a reflection type and a property kind. Generic
 */
export type PropDeclarationReflection = WithKind<
  ReflectionKind.Property,
  DeclarationReflectionWithReflectedType
>;

/**
 * A type corresponding to the HTTP method of a route, which is a property off of the object with the route name in a `MethodMap`
 */
export type HTTPMethodDeclarationReflection = WithName<
  AllowedHttpMethod,
  PropDeclarationReflection
>;

/**
 * A declaration reflection having a reflection type. Generic
 */
export type DeclarationReflectionWithReflectedType = WithSomeType<
  ReflectionType,
  DeclarationReflection
>;

/**
 * Type corresponding to the value of the `command` property within a `MethodDef`, which must be a type literal.
 */
export type CommandPropDeclarationReflection = WithSomeType<LiteralType, DeclarationReflection>;

/**
 * A generic type guard
 */
export type Guard<T> = (value: any) => value is T;

/**
 * Type corresponding to an execute method map
 */
export type ExecMethodDeclarationReflection = WithName<
  typeof NAME_EXECUTE_METHOD_MAP,
  DeclarationReflectionWithReflectedType
> & {
  flags: ReflectionFlags & {isStatic: true};
};

/**
 * Type corresponding to the `params` prop of a `MethodDef`
 */
export type MethodDefParamsPropDeclarationReflection = WithNameAndKind<
  typeof NAME_PARAMS,
  ReflectionKind.Property,
  DeclarationReflectionWithReflectedType
>;

/**
 * Type corresponding to the `payloadParams` prop of an `ExecMethodDef`
 */
export type ExecMethodDefParamsPropDeclarationReflection = WithName<
  typeof NAME_PARAMS,
  DeclarationReflectionWithReflectedType
>;

export type AppiumTypesReflection = WithNameAndKind<
  typeof NAME_TYPES_MODULE,
  ReflectionKind.Module,
  ParentReflection
>;

export type InterfaceDeclarationReflection = WithKind<
  ReflectionKind.Interface,
  DeclarationReflection
>;

export type ExternalDriverDeclarationReflection = WithName<
  typeof NAME_EXTERNAL_DRIVER,
  InterfaceDeclarationReflection
>;

export type AsyncMethodDeclarationReflection = WithSomeType<ReferenceType, DeclarationReflection> &
  WithKind<ReflectionKind.Method, DeclarationReflection>;

export interface KnownMethodData {
  comment?: Comment;
  method: AsyncMethodDeclarationReflection;
}

export type KnownMethods = Map<string, KnownMethodData>;

export interface MethodDefParam {
  name: string;
}

export type ClassDeclarationReflection = WithKind<ReflectionKind.Class, DeclarationReflection>;

export type ParamsPropDeclarationReflection =
  | ExecMethodDefParamsPropDeclarationReflection
  | MethodDefParamsPropDeclarationReflection;

export type CallSignatureReflection = WithKind<ReflectionKind.CallSignature, SignatureReflection>;
