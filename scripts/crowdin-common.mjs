import path from 'node:path';

import {logger, fs} from '@appium/support';
import axios from 'axios';
import _ from 'lodash';

export const log = logger.getLogger('CROWDIN');

// https://developer.crowdin.com/api/v2/
const PROJECT_ID = process.env.CROWDIN_PROJECT_ID;
const API_TOKEN = process.env.CROWDIN_TOKEN;
if (!PROJECT_ID || !API_TOKEN) {
  throw new Error(`Both CROWDIN_PROJECT_ID and CROWDIN_TOKEN environment variables must be set`);
}
export const RESOURCES_ROOT = path.resolve('packages', 'appium', 'docs');
export const ORIGINAL_LANGUAGE = 'en';
export const DOCUMENTS_EXT = '.md';
export const MKDOCS_YAML = (langName) => `mkdocs-${langName}.yml`;
const USER_AGENT = 'Appium CI';
const API_ROOT = 'https://api.crowdin.com/api/v2';

/**
 *
 * @param {string} dir
 * @param {string} ext
 * @returns {Promise<string[]>}
 */
export async function walk(dir, ext) {
  const itemsInDir = await fs.readdir(dir);
  const result = [];
  for (const itemInDir of itemsInDir) {
    const fullPath = path.join(dir, itemInDir);
    let stats;
    try {
      stats = await fs.stat(fullPath);
    } catch (e) {
      continue;
    }
    if (stats.isDirectory()) {
      result.push(...(await walk(fullPath, ext)));
    } else if (itemInDir.endsWith(ext)) {
      result.push(fullPath);
    }
  }
  return result;
}

/**
 *
 * @param {string} [suffix='']
 * @param {ApiRequestOptions} [opts={}]
 * @returns {any}
 */
export async function performApiRequest(suffix = '', opts = {}) {
  const {method = 'GET', payload, headers, params, isProjectSpecific = true} = opts;
  const url = isProjectSpecific
    ? `${API_ROOT}/projects/${PROJECT_ID}${suffix}`
    : `${API_ROOT}${suffix}`;
  log.debug(`Sending ${method} request to ${url}`);
  if (_.isPlainObject(payload)) {
    log.debug(`Request payload: ${JSON.stringify(payload)}`);
  }
  return (
    await axios({
      method,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        ...(headers || {}),
      },
      url,
      params,
      data: payload,
    })
  ).data;
}

/**
 * @typedef {Object} ApiRequestOptions
 * @property {string} [method='GET']
 * @property {any} [payload]
 * @property {axios.AxiosRequestHeaders} headers
 * @property {Record<string, any>} [params]
 * @property {boolean} [isProjectSpecific=true]
 */
