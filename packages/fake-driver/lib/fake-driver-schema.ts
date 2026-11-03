/**
 * JSON Schema for Fake Driver CLI/server arguments.
 * Could be a .json file; kept as TS for consistency and type export.
 */
export interface FakeDriverSchema {
  type: 'object';
  title: string;
  description: string;
  properties: {
    'silly-web-server-port'?: {
      type: 'integer';
      minimum: number;
      maximum: number;
      description: string;
    };
    sillyWebServerHost?: {
      type: 'string';
      description: string;
      default?: string;
    };
  };
}

const schema: FakeDriverSchema = {
  type: 'object',
  title: 'Fake Driver Configuration',
  description: 'A schema for Fake Driver arguments',
  properties: {
    'silly-web-server-port': {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
      description: 'The port to use for the fake web server',
    },
    sillyWebServerHost: {
      type: 'string',
      description: 'The host to use for the fake web server',
      default: 'sillyhost',
    },
  },
};

export default schema;
