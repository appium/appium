/**
 * Utils used across entire package
 * @module
 */

import _ from 'lodash';
import {DeclarationReflection} from 'typedoc';
import {isCallSignatureReflection, isReflectionWithReflectedType} from './guards';

/**
 * Loops through signatures of the command's method declaration and returns the first that is a
 * `CallSignatureReflection` (if any).  This is what we think of when we think "function signature"
 * This also works on DeclarationReflections that have a reflected type; in other words, some value that is the type of a function, but is not a function itself (such as a property assigned to a function).
 */
export const findCallSignature = _.memoize(
  (refl?: DeclarationReflection) =>
    refl?.getAllSignatures()?.find(isCallSignatureReflection) ??
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.getAllSignatures()?.find(isCallSignatureReflection)
      : undefined)
);
