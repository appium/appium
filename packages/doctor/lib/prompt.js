import { prompt } from './utils';

/**
 * @type {string|undefined}
 */
let persistentResponse;

const fixItQuestion = {
  type: 'list',
  name: 'confirmation',
  message: 'Fix it:',
  choices: ['yes', 'no', 'always', 'never'],
  /**
   *
   * @param {string} val
   * @returns {string}
   */
  filter(val) {
    return val.toLowerCase();
  },
};

/**
 * @param {Record<string, any>} opts
 */
export function configure(opts) {
  if (opts.yes) {
    persistentResponse = 'yes';
  }
  if (opts.no) {
    persistentResponse = 'no';
  }
}

/**
 * @returns {void}
 */
export function clear() {
  persistentResponse = undefined;
}

/**
 * @returns {Promise<string|undefined>}
 */
export async function fixIt() {
  if (persistentResponse) {
    return persistentResponse;
  }
  const resp = await prompt(fixItQuestion);
  persistentResponse = resp.confirmation === 'always' ? 'yes' : persistentResponse;
  persistentResponse = resp.confirmation === 'never' ? 'no' : persistentResponse;
  return persistentResponse || resp.confirmation;
}
