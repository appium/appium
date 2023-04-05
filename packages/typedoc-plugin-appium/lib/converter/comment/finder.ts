import parameter from './parameter';
import method from './method';
import signature from './signature';
import {Reflection, ReflectionKind} from 'typedoc';
import {CommentFinder} from './types';
import {CommentSource} from '../types';

const nullFinder: CommentFinder = {
  /**
   *
   * @returns A comment which was directly provided
   */
  getter: ({comment}) => comment,
  commentSource: CommentSource.OtherComment,
};

function getFinders(refl?: Reflection): Readonly<CommentFinder[]> {
  if (!refl) {
    return [nullFinder];
  }
  switch (refl.kind) {
    case ReflectionKind.Parameter:
      return [...parameter, nullFinder];
    case ReflectionKind.Method:
    case ReflectionKind.Property:
      return [...method, nullFinder];
    case ReflectionKind.CallSignature:
      return [...signature, nullFinder];
  }
  return [nullFinder];
}

export {getFinders};
