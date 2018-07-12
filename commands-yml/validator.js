import validate from 'validate.js';
import _ from 'lodash';

validate.validators.array = function (value, options, key, attributes) {
  if (attributes[key] && !validate.isArray(attributes[key])) {
    return `must be an array`;
  }
};

validate.validators.hasAttributes = function (value, options) {
  if (!value) {
    return;
  }

  if (!_.isArray(value)) {
    value = [value];
  }

  for (const item of value) {
    for (const option of options) {
      if (_.isUndefined(item[option])) {
        return `must have attributes: ${options}`;
      }
    }
  }
};

validate.validators.hasPossibleAttributes = function (value, options) {
  if (!value) {
    return;
  }

  // if just a bare value, allow it through
  if (!_.isArray(value)) {
    return;
  }

  for (const item of value) {
    for (const key of _.keys(item)) {
      if (!options.includes(key)) {
        return `must not include '${key}'. Available options: ${options}`;
      }
    }
  }
};

export default {
  'name': {presence: true},
  'short_description': {presence: true},
  'example_usage': {},
  'example_usage.java': {},
  'example_usage.javascript_wdio': {},
  'example_usage.javascript_wd': {},
  'example_usage.ruby': {},
  'example_usage.csharp': {},
  'example_usage.php': {},
  'description': {},
  'client_docs.java': {hasPossibleAttributes: ['url', 'android', 'ios']},
  'client_docs.javascript_wdio': {url: true},
  'client_docs.javascript_wd': {url: true},
  'client_docs.ruby': {},
  'client_docs.csharp': {url: true},
  'client_docs.php': {url: true},
  'endpoint': {presence: true},
  'driver_support': {presence: true},
  'endpoint.url': {presence: true},
  'endpoint.url_parameters': {array: true, hasAttributes: ['name', 'description']},
  'endpoint.json_parameters': {array: true, hasAttributes: ['name', 'description']},
  'endpoint.response': {hasAttributes: ['type', 'description'] },
  'specifications': {presence: true},
  'links': {array: true, hasAttributes: ['name', 'url']},
};
