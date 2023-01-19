import {
  Comment,
  DeclarationReflection,
  LiteralType,
  ParameterReflection,
  ReferenceType,
  ReflectionFlags,
  ReflectionKind,
  ReflectionType,
  SignatureReflection,
  SomeType,
  TupleType,
  TypeOperatorType,
} from 'typedoc';
import {
  AllowedHttpMethod,
  AppiumPluginReflectionKind,
  CommandReflection,
  ParentReflection,
} from '../model';
import {NAME_EXTERNAL_DRIVER, NAME_TYPES_MODULE} from './builtin-external-driver';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_METHOD_MAP} from './builtin-method-map';
import {NAME_NEW_METHOD_MAP, NAME_EXECUTE_METHOD_MAP, NAME_PARAMS} from './external';

type WithName<S extends string, R> = R & {
  name: S;
};

type WithKind<K extends ReflectionKind | AppiumPluginReflectionKind, R> = R & {kind: K};

/**
 * Utility to narrow a declaration reflection to a specific `SomeType`
 */
type WithSomeType<T extends SomeType, R> = R & {type: T};

/**
 * Utility to narrow by name and kind
 */
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
> &
  WithStaticFlag;

/**
 * Whatever has this flag will be a static member
 */
export type WithStaticFlag = {flags: ReflectionFlags & {isStatic: true}};
/**
 * Whatever has this flag will _not_ be a static member
 */
export type WithoutStaticFlag = {flags: ReflectionFlags & {isStatic: false}};

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

/**
 * Type corresponding to `@appium/types` module
 */
export type AppiumTypesReflection = WithNameAndKind<
  typeof NAME_TYPES_MODULE,
  ReflectionKind.Module,
  ParentReflection
>;

/**
 * Type corresponding to a TS `interface`
 */
export type InterfaceDeclarationReflection = WithKind<
  ReflectionKind.Interface,
  DeclarationReflection
>;

/**
 * Type corresponding to the `ExternalDriver` `interface` of `@appium/types`
 */
export type ExternalDriverDeclarationReflection = WithName<
  typeof NAME_EXTERNAL_DRIVER,
  InterfaceDeclarationReflection
>;

/**
 * A call signature for a function that returns some sort of `Promise`.
 */
export type AsyncCallSignatureReflection = CallSignatureReflection & {
  type: ReferenceType;
  name: 'Promise';
};

/**
 * An async method or reference to an async method.  In a driver, a command's method must be of this type.
 */
export type CommandMethodDeclarationReflection<
  T extends ReferenceType | ReflectionType = ReferenceType
> = WithSomeType<T, DeclarationReflection> &
  WithKind<
    T extends ReferenceType ? ReflectionKind.Method : ReflectionKind.Property,
    DeclarationReflection
  > &
  WithoutStaticFlag &
  (T extends ReferenceType
    ? {
        signatures: NonEmptyArray<AsyncCallSignatureReflection>;
      }
    : T extends ReflectionType
    ? {
        type: {
          declaration: {
            signatures: NonEmptyArray<AsyncCallSignatureReflection>;
          };
        };
      }
    : never);

/**
 * A lookup of command names to their reflections.
 */
export type KnownMethods = Map<string, CommandMethodDeclarationReflection>;

/**
 * A {@linkcode DeclarationReflection} which is a `class`.
 */
export type ClassDeclarationReflection = WithKind<ReflectionKind.Class, DeclarationReflection>;

/**
 * A constructor
 */
export type ConstructorDeclarationReflection = WithNameAndKind<
  'constructor',
  ReflectionKind.Constructor,
  DeclarationReflection
>;

/**
 * A {@linkcode ReferenceType} referencing the constructor of `BasePlugin`
 */
export type BasePluginConstructorReferenceType = ReferenceType & {name: 'BasePlugin.constructor'};

/**
 * A {@linkcode DeclarationReflection} for the constructor of a class extending `BasePlugin`
 */
export type BasePluginConstructorDeclarationReflection = WithSomeType<
  ReferenceType,
  DeclarationReflection
> &
  ConstructorDeclarationReflection &
  (
    | {inheritedFrom: BasePluginConstructorReferenceType}
    | {overwrites: BasePluginConstructorReferenceType}
  );

/**
 * One of {@linkcode ExecMethodDefParamsPropDeclarationReflection} or
 * {@linkcode MethodDefParamsPropDeclarationReflection}, which are "parameters" properties of method
 * definition objects (as in a `MethodMap`) or execute method definitions (in an `ExecMethodMap`)
 */
export type ParamsPropDeclarationReflection =
  | ExecMethodDefParamsPropDeclarationReflection
  | MethodDefParamsPropDeclarationReflection;

/**
 * A {@linkcode SignatureReflection} which is a call signature; a function signature.
 *
 * (Other types of signatures include things like "constructor signatures")
 */
export type CallSignatureReflection = WithKind<ReflectionKind.CallSignature, SignatureReflection>;

/**
 * An array with a nonzero number of items.
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * A {@linkcode CallSignatureReflection} with a nonzero number of parameters.
 *
 * This is used to rename parameters on commands to prefer the ones as defined in the method map.
 */
export type CallSignatureReflectionWithArity = CallSignatureReflection & {
  parameters: NonEmptyArray<ParameterReflection>;
};

/**
 * Can be used to narrow a {@linkcode CommandReflection} to one representing an execute method.
 */
export type ExecuteMethodCommandReflection = CommandReflection & {
  kind: typeof AppiumPluginReflectionKind.ExecuteMethod;
  script: string;
};
