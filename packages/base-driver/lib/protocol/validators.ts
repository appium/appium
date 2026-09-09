import {util} from '@appium/support';

const MAX_URL_ERROR_LENGTH = 100;

export type CommandValidator = (...args: any[]) => void;

export const validators = {
  setUrl: (url: any) => {
    if (typeof url !== 'string' || !URL.canParse(url)) {
      throw new Error(`'${util.truncateString(String(url), {length: MAX_URL_ERROR_LENGTH})}' must be a valid URL`);
    }
  },
  /** @deprecated Only used by the deprecated `setNetworkConnection` MJSONWP route. */
  setNetworkConnection: (type: any) => {
    if (![0, 1, 2, 4, 6].includes(Number(type))) {
      throw new Error('Network type must be one of 0, 1, 2, 4, 6');
    }
  },
} satisfies Record<string, CommandValidator>;

/**
 * Looks up the validator for a driver command name, if one is registered.
 * @param command - Driver command name
 */
export function getCommandValidator(command: string): CommandValidator | undefined {
  return (validators as Record<string, CommandValidator>)[command];
}
