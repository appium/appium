import {isCallSignatureReflection, isParameterReflection} from '../../guards';
import {findCallSignature} from '../../utils';
import {CommentSource} from '../types';
import {CommentFinder} from './types';

export default [
  {
    getter({refl}) {
      if (!isParameterReflection(refl)) {
        return;
      }
      return refl.comment?.hasVisibleComponent() ? refl.comment : undefined;
    },
    commentSource: CommentSource.Parameter,
  },
  {
    /**
     * @returns The comment from some method that this one implements or overwrites or w/e;
     * typically coming from interfaces in `@appium/types`
     */
    getter({refl, knownBuiltinMethods}) {
      if (!isParameterReflection(refl) || !knownBuiltinMethods) {
        return;
      }
      const signatureRefl = refl.parent;
      if (!isCallSignatureReflection(signatureRefl)) {
        return;
      }
      const methodRefl = signatureRefl.parent;
      const paramIdx = signatureRefl.parameters?.indexOf(refl);
      if (paramIdx === undefined || paramIdx < 0) {
        return;
      }

      const builtinMethodRefl = knownBuiltinMethods.get(methodRefl.name);

      if (!builtinMethodRefl) {
        return;
      }

      const builtinParams = findCallSignature(builtinMethodRefl)?.parameters;

      if (!builtinParams?.[paramIdx]) {
        return;
      }
      const builtinParam = builtinParams[paramIdx];
      if (builtinParam.comment?.hasVisibleComponent()) {
        return builtinParam.comment;
      }
    },
    commentSource: CommentSource.BuiltinParameter,
  },
] as Readonly<CommentFinder[]>;
