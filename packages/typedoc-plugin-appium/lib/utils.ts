/**
 * Utils used across entire package
 * @module
 */

import _ from 'lodash';
import {DeclarationReflection} from 'typedoc';
import {isCallSignatureReflection} from './guards';

/**
 * Loops through signatures of the command's method declaration and returns the first that is a
 * `CallSignatureReflection` (if any).  This is what we think of when we think "function signature"
 */
export const findCallSignature = _.memoize((refl?: DeclarationReflection) =>
  refl?.getAllSignatures()?.find(isCallSignatureReflection)
);
