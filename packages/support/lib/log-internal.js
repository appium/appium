import fs from './fs';
import _ from 'lodash';

const DEFAULT_REPLACER = '**SECURE**';

/**
 * Type guard for log filter type
 * @param {object} value
 * @returns {value is import('@appium/types').LogFilterRegex}
 */
function isLogFilterRegex(value) {
  return 'pattern' in value;
}

class SecureValuesPreprocessor {
  constructor() {
    this._rules = [];
  }

  /**
   * @returns {Array<SecureValuePreprocessingRule>} The list of successfully
   * parsed preprocessing rules
   */
  get rules() {
    return this._rules;
  }

  /**
   * Parses single rule from the given JSON file
   *
   * @param {string|import('@appium/types').LogFilter} rule The rule might either be represented as a single string
   * or a configuration object
   * @throws {Error} If there was an error while parsing the rule
   * @returns {SecureValuePreprocessingRule} The parsed rule
   */
  parseRule(rule) {
    let pattern;
    let replacer = DEFAULT_REPLACER;
    let flags = ['g'];
    if (_.isString(rule)) {
      if (rule.length === 0) {
        throw new Error(`${JSON.stringify(rule)} -> The value must not be empty`);
      }
      pattern = `\\b${_.escapeRegExp(rule)}\\b`;
    } else if (_.isPlainObject(rule)) {
      if (isLogFilterRegex(rule)) {
        if (!_.isString(rule.pattern) || rule.pattern.length === 0) {
          throw new Error(
            `${JSON.stringify(rule)} -> The value of 'pattern' must be a valid non-empty string`
          );
        }
        pattern = rule.pattern;
      } else if (_.has(rule, 'text')) {
        if (!_.isString(rule.text) || rule.text.length === 0) {
          throw new Error(
            `${JSON.stringify(rule)} -> The value of 'text' must be a valid non-empty string`
          );
        }
        pattern = `\\b${_.escapeRegExp(rule.text)}\\b`;
      }
      if (!pattern) {
        throw new Error(
          `${JSON.stringify(rule)} -> Must either have a field named 'pattern' or 'text'`
        );
      }

      if (_.has(rule, 'flags')) {
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Advanced_searching_with_flags_2
        for (const flag of ['i', 'g', 'm', 's', 'u', 'y']) {
          if (_.includes(rule.flags, flag)) {
            flags.push(flag);
          }
        }
        flags = _.uniq(flags);
      }

      if (_.isString(rule.replacer)) {
        replacer = rule.replacer;
      }
    } else {
      throw new Error(`${JSON.stringify(rule)} -> Must either be a string or an object`);
    }

    return {
      pattern: new RegExp(pattern, flags.join('')),
      replacer,
    };
  }

  /**
   * Loads rules from the given JSON file
   *
   * @param {string|string[]|import('@appium/types').LogFiltersConfig} source The full path to the JSON file containing secure
   * values replacement rules or the rules themselves represented as an array
   * @throws {Error} If the format of the source file is invalid or
   * it does not exist
   * @returns {Promise<string[]>} The list of issues found while parsing each rule.
   * An empty list is returned if no rule parsing issues were found
   */
  async loadRules(source) {
    let rules;
    if (_.isArray(source)) {
      rules = source;
    } else {
      if (!(await fs.exists(source))) {
        throw new Error(`'${source}' does not exist or is not accessible`);
      }
      try {
        rules = JSON.parse(await fs.readFile(source, 'utf8'));
      } catch (e) {
        throw new Error(`'${source}' must be a valid JSON file. Original error: ${e.message}`);
      }
      if (!_.isArray(rules)) {
        throw new Error(`'${source}' must contain a valid JSON array`);
      }
    }

    const issues = [];
    this._rules = [];
    for (const rule of rules) {
      try {
        this._rules.push(this.parseRule(rule));
      } catch (e) {
        issues.push(e.message);
      }
    }
    return issues;
  }

  /**
   * Performs secure values replacement inside the given string
   * according to the previously loaded rules. No replacement is made
   * if there are no rules or the given value is not a string
   *
   * @param {string} str The string to make replacements in
   * @returns {string} The string with replacements made
   */
  preprocess(str) {
    if (this._rules.length === 0 || !_.isString(str)) {
      return str;
    }

    let result = str;
    for (const rule of this._rules) {
      result = result.replace(rule.pattern, rule.replacer);
    }
    return result;
  }
}

const SECURE_VALUES_PREPROCESSOR = new SecureValuesPreprocessor();

export {SECURE_VALUES_PREPROCESSOR, SecureValuesPreprocessor};
export default SECURE_VALUES_PREPROCESSOR;

/**
 * @typedef SecureValuePreprocessingRule
 * @property {RegExp} pattern The parsed pattern which is going to be used for replacement
 * @property {string} [replacer] The replacer value to use. By default
 * equals to `DEFAULT_SECURE_REPLACER`
 */
