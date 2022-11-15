import {DeclarationReflection, ReflectionType} from 'typedoc';
import {NAME_BUILTIN_COMMAND_MODULE, NAME_METHOD_MAP, NAME_NEW_METHOD_MAP} from './converter';

export type MethodMapDeclarationReflection = DeclarationReflection & {
  name: typeof NAME_METHOD_MAP | typeof NAME_NEW_METHOD_MAP;
  type: ReflectionType;
};

export type BaseDriverDeclarationReflection = DeclarationReflection & {
  name: typeof NAME_BUILTIN_COMMAND_MODULE;
};
