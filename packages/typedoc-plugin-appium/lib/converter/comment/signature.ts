/**
 * Strategies to derive a comment from a `SignatureReflection`
 * @module
 */

import {isCallSignatureReflection} from '../../guards';
import {findCallSignature} from '../../utils';
import {CommentSource} from '../types';
import {CommentFinder} from './types';

export default [
  {
    getter({refl}) {
      if (!isCallSignatureReflection(refl)) {
        return;
      }
      if (refl.comment?.hasVisibleComponent()) {
        return refl.comment;
      }
    },
    commentSource: CommentSource.Signature,
  },
  {
    /**
     * @returns The comment from some method that this one implements or overwrites or w/e;
     * typically coming from interfaces in `@appium/types`
     */
    getter({refl, knownBuiltinMethods}) {
      if (!isCallSignatureReflection(refl)) {
        return;
      }
      const methodRefl = refl.parent;
      const builtinMethodRefl = knownBuiltinMethods?.get(methodRefl.name);
      if (!builtinMethodRefl) {
        return;
      }
      const builtinSig = findCallSignature(builtinMethodRefl);

      if (!builtinSig) {
        return;
      }
      if (builtinSig.comment?.hasVisibleComponent()) {
        return builtinSig.comment;
      }
    },
    commentSource: CommentSource.BuiltinSignature,
  },
] as Readonly<CommentFinder[]>;
