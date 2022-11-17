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

export type MethodMapDeclarationReflection = DeclarationReflectionWithReflectedType & {
  name: typeof NAME_METHOD_MAP | typeof NAME_NEW_METHOD_MAP;
};

export type BaseDriverDeclarationReflection = DeclarationReflection & {
  name: typeof NAME_BUILTIN_COMMAND_MODULE;
};

export type WithType<T extends SomeType> = {type: T};

export type MethodDefParamsDeclarationReflection = DeclarationReflection &
  WithType<
    WithReadonlyOperator & {
      target: TupleType & {
        elements: LiteralType[];
      };
    }
  >;

export type WithReadonlyOperator = TypeOperatorType & {operator: 'readonly'};

export type RoutePropDeclarationReflection = DeclarationReflectionWithReflectedType & {
  kind: ReflectionKind.Property;
};

export type HTTPMethodDeclarationReflection = DeclarationReflectionWithReflectedType & {
  kind: ReflectionKind.Property;
  originalName: AllowedHttpMethod;
};

export type DeclarationReflectionWithReflectedType = DeclarationReflection &
  WithType<ReflectionType>;

export type CommandPropDeclarationReflection = DeclarationReflection & WithType<LiteralType>;

/**
 * A generic type guard
 */
export type Guard<T> = (value: any) => value is T;
