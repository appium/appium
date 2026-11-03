import type {BidiMethodMap} from '@appium/types';

export const INPUT_BIDI_COMMANDS = {
  performActions: {
    command: 'bidiInputPerformActions',
    params: {
      required: ['context', 'actions'],
    },
  },
  releaseActions: {
    command: 'bidiInputReleaseActions',
    params: {
      required: ['context'],
    },
  },
  setFiles: {
    command: 'bidiInputSetFiles',
    params: {
      required: ['context', 'element', 'files'],
    },
  },
} as const satisfies BidiMethodMap;
