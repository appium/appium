import {util} from '@appium/support';

import {errors} from './errors.js';

const MAX_URL_ERROR_LENGTH = 100;

export type CommandValidator = (...args: any[]) => void;

export const validators = {
  setUrl: (url: any) => {
    if (typeof url !== 'string' || !URL.canParse(url)) {
      const description =
        typeof url === 'string' ? `'${util.truncateString(url, {length: MAX_URL_ERROR_LENGTH})}'` : 'The url parameter';
      throw new errors.InvalidArgumentError(`${description} must be a valid URL`);
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
