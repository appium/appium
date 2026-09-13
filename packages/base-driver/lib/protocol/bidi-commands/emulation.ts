import type {BidiMethodMap} from '@appium/types';

export const EMULATION_BIDI_COMMANDS = {
  setForcedColorsModeThemeOverride: {
    command: 'bidiEmulationSetForcedColorsModeThemeOverride',
    params: {
      required: ['theme'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setGeolocationOverride: {
    command: 'bidiEmulationSetGeolocationOverride',
    params: {
      optional: ['coordinates', 'error', 'contexts', 'userContexts'],
    },
  },
  setLocaleOverride: {
    command: 'bidiEmulationSetLocaleOverride',
    params: {
      required: ['locale'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setMediaFeaturesOverride: {
    command: 'bidiEmulationSetMediaFeaturesOverride',
    params: {
      required: ['features'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setNetworkConditions: {
    command: 'bidiEmulationSetNetworkConditions',
    params: {
      required: ['networkConditions'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setScreenSettingsOverride: {
    command: 'bidiEmulationSetScreenSettingsOverride',
    params: {
      required: ['screenArea'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setScreenOrientationOverride: {
    command: 'bidiEmulationSetScreenOrientationOverride',
    params: {
      required: ['screenOrientation'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setUserAgentOverride: {
    command: 'bidiEmulationSetUserAgentOverride',
    params: {
      required: ['userAgent'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setViewportMetaOverride: {
    command: 'bidiEmulationSetViewportMetaOverride',
    params: {
      required: ['viewportMeta'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setScriptingEnabled: {
    command: 'bidiEmulationSetScriptingEnabled',
    params: {
      required: ['enabled'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setScrollbarTypeOverride: {
    command: 'bidiEmulationSetScrollbarTypeOverride',
    params: {
      required: ['scrollbarType'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setTimezoneOverride: {
    command: 'bidiEmulationSetTimezoneOverride',
    params: {
      required: ['timezoneId'],
      optional: ['contexts', 'userContexts'],
    },
  },
  setTouchOverride: {
    command: 'bidiEmulationSetTouchOverride',
    params: {
      required: ['maxTouchPoints'],
      optional: ['contexts', 'userContexts'],
    },
  },
} as const satisfies BidiMethodMap;
