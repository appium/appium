import type {BidiMethodMap} from '@appium/types';

export const BROWSING_CONTEXT_BIDI_COMMANDS = {
  activate: {
    command: 'bidiBrowsingContextActivate',
    params: {
      required: ['context'],
    },
  },
  captureScreenshot: {
    command: 'bidiBrowsingContextCaptureScreenshot',
    params: {
      required: ['context'],
      optional: ['origin', 'format', 'clip', 'imageSize'],
    },
  },
  close: {
    command: 'bidiBrowsingContextClose',
    params: {
      required: ['context'],
      optional: ['promptUnload'],
    },
  },
  create: {
    command: 'bidiBrowsingContextCreate',
    params: {
      required: ['type'],
      optional: ['referenceContext', 'background', 'userContext'],
    },
  },
  getTree: {
    command: 'bidiBrowsingContextGetTree',
    params: {
      optional: ['maxDepth', 'root'],
    },
  },
  handleUserPrompt: {
    command: 'bidiBrowsingContextHandleUserPrompt',
    params: {
      required: ['context'],
      optional: ['accept', 'userText'],
    },
  },
  locateNodes: {
    command: 'bidiBrowsingContextLocateNodes',
    params: {
      required: ['context', 'locator'],
      optional: ['maxNodeCount', 'serializationOptions', 'startNodes'],
    },
  },
  navigate: {
    command: 'bidiNavigate',
    params: {
      required: ['context', 'url'],
      optional: ['wait'],
    },
  },
  print: {
    command: 'bidiBrowsingContextPrint',
    params: {
      required: ['context'],
      optional: ['background', 'margin', 'orientation', 'page', 'pageRanges', 'scale', 'shrinkToFit'],
    },
  },
  reload: {
    command: 'bidiBrowsingContextReload',
    params: {
      required: ['context'],
      optional: ['ignoreCache', 'wait'],
    },
  },
  setBypassCSP: {
    command: 'bidiBrowsingContextSetBypassCSP',
    params: {
      required: ['bypass'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setViewport: {
    command: 'bidiBrowsingContextSetViewport',
    params: {
      optional: ['context', 'viewport', 'devicePixelRatio', 'userContexts'],
    },
  },
  startScreencast: {
    command: 'bidiBrowsingContextStartScreencast',
    params: {
      required: ['context'],
      optional: ['mimeType', 'video', 'audio'],
    },
  },
  stopScreencast: {
    command: 'bidiBrowsingContextStopScreencast',
    params: {
      required: ['screencast'],
    },
  },
  traverseHistory: {
    command: 'bidiBrowsingContextTraverseHistory',
    params: {
      required: ['context', 'delta'],
    },
  },
} as const satisfies BidiMethodMap;
