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

  if (_.isObject(value) && !_.isArray(value)) {
    value = [value];
  }

  for (let item of value) {
    for (let option of options) {
      if (_.isUndefined(item[option])) {
        return `must have attributes: ${options}`;
      }
    }
  }
};

export default {
  'name': {presence: true},
  'example_usage': {presence: true},
  'example_usage.java': {presence: true},
  'example_usage.javascript_wdio': {presence: true},
  'example_usage.javascript_wd': {presence: true},
  'example_usage.ruby': {presence: true},
  'example_usage.csharp': {presence: true},
  'example_usage.php': {presence: true},
  'description': {presence: true},
  'client_docs.java': {presence: true, url: true},
  'client_docs.javascript_wdio': {presence: true, url: true},
  'client_docs.javascript_wd': {presence: true, url: true},
  'client_docs.ruby': {presence: true, url: true},
  'client_docs.csharp': {presence: true, url: true},
  'client_docs.php': {presence: true, url: true},
  'endpoint': {presence: true},
  'driver_support': {presence: true},
  'endpoint.url': {presence: true},
  'endpoint.url_parameters': { 'array': true, hasAttributes: ['name', 'description'] },
  'endpoint.json_parameters': { 'array': true, hasAttributes: ['name', 'description'] },
  'endpoint.response': {presence: true, hasAttributes: ['name', 'type', 'description'] },
  'specifications': {presence: true},
  'links': { 'array': true, hasAttributes: ['name', 'url'] },
};