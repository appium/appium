// this could be a .json file, too:
// {
//   "$schema": "http://json-schema.org/draft-07/schema",
//   "$id": "https://appium.io/fake-driver.json",
//   "type": "object",
//   "title": "Fake Driver Configuration",
//   "description": "A schema for Fake Driver arguments",
//   "properties": {
//     "answer": {
//       "type": "number",
//       "description": "The answer to life, the universe, and everything",
//       "default": 42
//     }
//   }
// }


export default {
  type: 'object',
  title: 'Fake Driver Configuration',
  description: 'A schema for Fake Driver arguments',
  properties: {
    // the prop name will always be normalized to camelCase
    'silly-web-server-port': {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
      description: 'The port to use for the fake web server',
    },
    sillyWebServerHost: {
      type: 'string',
      description: 'The host to use for the fake web server',
      default: 'sillyhost'
    }
  }
};
