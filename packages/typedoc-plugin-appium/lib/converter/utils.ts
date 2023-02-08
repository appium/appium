/**
 * Utilities for the various converters.
 * @module
 */

import {DeclarationReflection, LiteralType, ProjectReflection, ReflectionKind} from 'typedoc';
import {
  isAsyncMethodDeclarationReflection,
  isMethodDefParamNamesDeclarationReflection,
  isReflectionWithReflectedType,
} from '../guards';
import {ParentReflection} from '../model';
import {NAME_OPTIONAL, NAME_REQUIRED} from './external';
import {
  ClassDeclarationReflection,
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
 * Finds _all_ async methods in a class or interface
 * @param refl Class reflection
 * @returns Map of method names to method reflections
 */
export function findAsyncMethodsInReflection(
  refl: ClassDeclarationReflection | InterfaceDeclarationReflection
): KnownMethods {
  return new Map(
    filterChildrenByGuard(refl, isAsyncMethodDeclarationReflection).map((method) => [
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
