/**
 * Utilities for the various converters.
 * @module
 */

import _ from 'lodash';
import {
  DeclarationReflection,
  LiteralType,
  ParameterReflection,
  ProjectReflection,
  Reflection,
  ReflectionFlag,
  ReflectionFlags,
  ReflectionKind,
  SignatureReflection,
  SomeType,
  TypeParameterReflection,
} from 'typedoc';
import {
  isCommandMethodDeclarationReflection,
  isMethodDefParamNamesDeclarationReflection,
  isReflectionWithReflectedType,
} from '../guards';
import {ParentReflection} from '../model';
import {deriveComment} from './comment';
import {NAME_OPTIONAL, NAME_REQUIRED} from './external';
import {
  CallSignatureReflection,
  ClassDeclarationReflection,
  CommandMethodDeclarationReflection,
  Guard,
  InterfaceDeclarationReflection,
  KnownMethods,
  ParamsPropDeclarationReflection,
} from './types';

export function findParentReflectionByName(
  project: ProjectReflection,
  name: string
): ParentReflection | undefined {
  return project.name === name ? project : (project.getChildByName(name) as ParentReflection);
}

/**
 * Filters children by a type guard
 * @param refl - Reflection to check
 * @param guard - Type guard function
 * @returns Filtered children, if any
 * @internal
 */
export function filterChildrenByGuard<T extends ParentReflection, G extends DeclarationReflection>(
  refl: T,
  guard: Guard<G>
): G[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.filter(guard)
      : refl.children?.filter(guard)) ?? ([] as G[])
  );
}

/**
 * Finds a child of a reflection by type guard
 * @param refl - Reflection to check
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
export function findChildByGuard<T extends ParentReflection, G extends ParentReflection>(
  refl: T,
  guard: Guard<G>
): G | undefined {
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find(guard)
      : refl.children?.find(guard)
  ) as G | undefined;
}

/**
 * Finds a child of a reflection by name and type guard
 * @param refl - Reflection to check
 * @param name - Name of child
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
export function findChildByNameAndGuard<T extends ParentReflection, G extends ParentReflection>(
  refl: T,
  name: string,
  guard: Guard<G>
): G | undefined {
  const predicate = (child: {name: string}) => child.name === name && guard(child);
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find(predicate)
      : refl.children?.find(predicate)
  ) as G | undefined;
}

/**
 * Filters children of a reflection by kind and whether they are of type {@linkcode DeclarationReflectionWithReflectedType}
 * @param refl - Reflection to check
 * @param kind - Kind of child
 * @returns Filtered children, if any
 * @internal
 */

export function filterChildrenByKind<T extends DeclarationReflection>(
  refl: T,
  kind: ReflectionKind
): DeclarationReflection[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.getChildrenByKind(kind)
      : refl.getChildrenByKind(kind)) ?? ([] as DeclarationReflection[])
  );
}

/**
 * Finds _all_ async command methods in a class or interface
 * @param refl Class reflection
 * @returns Map of method names to method reflections
 */
export function findCommandMethodsInReflection(
  refl: ClassDeclarationReflection | InterfaceDeclarationReflection
): KnownMethods {
  return new Map(
    filterChildrenByGuard(refl, isCommandMethodDeclarationReflection).map((method) => [
      method.name,
      method,
    ])
  );
}

/**
 * Finds "optional" params in a method definition
 * @param methodDefRefl - Reflection of a method definition
 * @returns List of optional parameters
 * @internal
 */
export function convertOptionalCommandParams(
  methodDefRefl?: ParamsPropDeclarationReflection
): string[] {
  return convertCommandParams(NAME_OPTIONAL, methodDefRefl);
}

/**
 * Finds names of parameters of a command in a method def
 * @param propName Either required or optional params
 * @param refl Parent reflection (`params` prop of method def)
 * @returns List of parameter names
 * @internal
 */
export function convertCommandParams(
  propName: typeof NAME_OPTIONAL | typeof NAME_REQUIRED,
  refl?: ParamsPropDeclarationReflection
): string[] {
  if (!refl) {
    return [];
  }

  const props = findChildByNameAndGuard(refl, propName, isMethodDefParamNamesDeclarationReflection);

  if (!props) {
    return [];
  }

  return props.type.target.elements.reduce((names, el: LiteralType) => {
    const stringValue = String(el.value);
    if (stringValue) {
      names.push(stringValue);
    }
    return names;
  }, [] as string[]);
}

/**
 * Finds "required" params in a method definition
 * @param methodDefRefl - Reflection of a method definition
 * @returns List of required parameters
 * @internal
 */
export function convertRequiredCommandParams(
  methodDefRefl?: ParamsPropDeclarationReflection
): string[] {
  return convertCommandParams(NAME_REQUIRED, methodDefRefl);
}

/**
 * List of fields to shallow copy from a `ParameterReflection` to a clone
 * @internal
 */
const PARAMETER_REFLECTION_CLONE_FIELDS = [
  'anchor',
  'cssClasses',
  'defaultValue',
  'hasOwnDocument',
  'label',
  'originalName',
  'sources',
  'type',
  'url',
];

/**
 * Clones a `ParameterReflection`.
 *
 * @privateRemarks I think.
 * @param pRefl A `ParameterReflection`
 * @param param Desired name of parameter
 * @param parent Custom signature reflection
 * @param knownMethods Builtin methods for aggregating comments
 * @param optional If the parameter is considered "optional"
 * @returns A new `ParameterReflection` based on the first
 */
export function cloneParameterReflection(
  pRefl: ParameterReflection,
  param: string,
  parent: SignatureReflection,
  knownMethods?: KnownMethods,
  optional = false
) {
  const newPRefl = new ParameterReflection(param, ReflectionKind.Parameter, parent);
  _.assign(newPRefl, _.pick(pRefl, PARAMETER_REFLECTION_CLONE_FIELDS));
  // attempt to derive param comments.  these are "summary" comments only,
  // so we do not need to worry about combining block/summary comments like with methods.
  newPRefl.comment = deriveComment({
    refl: pRefl,
    knownMethods,
    comment: pRefl.comment,
  })?.comment;
  // there doesn't seem to be a straightforward way to clone flags.
  newPRefl.flags = new ReflectionFlags(...pRefl.flags);
  newPRefl.flags.setFlag(ReflectionFlag.Optional, optional);
  return newPRefl;
}

/**
 * Clones a type parameter reflection
 * @param tPRefl Type parameter reflection
 * @param parentRefl Parent
 * @returns A clone of the original type parameter reflection
 */
export function cloneTypeParameterReflection(
  tPRefl: TypeParameterReflection,
  parentRefl: Reflection
) {
  return new TypeParameterReflection(
    tPRefl.name,
    tPRefl.type,
    tPRefl.default,
    parentRefl,
    tPRefl.varianceModifier
  );
}

/**
 * List of fields to shallow copy from a `SignatureReflection` to a clone
 * @internal
 */
const SIGNATURE_REFLECTION_CLONE_FIELDS = [
  'anchor',
  'comment',
  'flags',
  'hasOwnDocument',
  'implementationOf',
  'inheritedFrom',
  'kindString',
  'label',
  'originalName',
  'overwrites',
  'parameters',
  'sources',
  'typeParameters',
  'url',
];

/**
 * This loops over a list of command parameter names as defined in the method/execute map and attempts
 * to create a new `ParameterReflection` for each, based on the given data.
 *
 * Because the command param names are essentially properties of a JSON object and the
 * `ParameterReflection` instances represent the arguments of a method, we must match them by
 * index. In JS, optional arguments cannot become before required arguments in a function
 * signature, so we can do those first. If there are _more_ method arguments than command param
 * names, we toss them out, because they may not be part of the public API.
 * @param sig Signature reflection
 * @param opts Options
 * @returns List of refls with names matching `commandParams`, throwing out any extra refls
 */
export function createNewParamRefls(
  sig: SignatureReflection,
  opts: CreateNewParamReflsOpts = {}
): ParameterReflection[] {
  const {builtinMethods = new Map(), commandParams = [], isOptional, isPluginCommand} = opts;
  if (!sig.parameters?.length) {
    // this should not happen, I think?
    return [];
  }
  // a plugin command's method has two leading args we don't need
  const newParamRefls: ParameterReflection[] = [];
  const pRefls = isPluginCommand ? sig.parameters.slice(2) : sig.parameters;
  for (const [idx, param] of commandParams.entries()) {
    const pRefl = pRefls[idx];
    if (pRefl) {
      const newPRefl = cloneParameterReflection(pRefl, param, sig, builtinMethods, isOptional);
      newParamRefls.push(newPRefl);
    }
  }
  return newParamRefls;
}

/**
 * Clones a `CallSignatureReflection` with a new parent and type.
 *
 * This does a "deep" clone inasmuch as it clones any associated `ParameterReflection` and
 * `TypeParameterReflection` instances.
 *
 * @privateRemarks I'm not sure this is sufficient.
 * @param sig A `CallSignatureReflection` to clone
 * @param parent The desired parent of the new `CallSignatureReflection`
 * @param type The desired type of the new `CallSignatureReflection`; if not provided, the original type
 * will be used
 * @returns A clone of `sig` with the given parent and type
 */
export function cloneCallSignatureReflection(
  sig: CallSignatureReflection,
  parent: CommandMethodDeclarationReflection,
  type?: SomeType
) {
  const newSig = new SignatureReflection(sig.name, ReflectionKind.CallSignature, parent);

  return _.assign(newSig, _.pick(sig, SIGNATURE_REFLECTION_CLONE_FIELDS), {
    parameters: _.map(sig.parameters, (p) => cloneParameterReflection(p, p.name, newSig)),
    typeParameters: _.map(sig.typeParameters, (tP) => cloneTypeParameterReflection(tP, newSig)),
    type: type ?? sig.type,
  });
}

/**
 * Options for {@linkcode createNewParamRefls}
 */
export interface CreateNewParamReflsOpts {
  /**
   * Map of known methods
   */
  builtinMethods?: KnownMethods;
  /**
   * List of parameter names from method def
   */
  commandParams?: string[];
  /**
   * If the parameter is marked as optional in the method def
   */
  isOptional?: boolean;
  /**
   * If the class containing the method is a Plugin.
   *
   * This is important because the `PluginCommand` type has a different signature than the
   * `DriverCommand` type; the former always has two specific arguments heading its parameter list,
   * and we do not need to include in the generated docs.
   */
  isPluginCommand?: boolean;
}
