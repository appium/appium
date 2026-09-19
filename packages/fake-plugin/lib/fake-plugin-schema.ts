/**
 * JSON Schema for Fake Plugin CLI/server arguments.
 * Could be a .json file; kept as TS for consistency and type export.
 */
export interface FakePluginSchema {
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
    host?: {
      type: 'string';
      description: string;
    };
    interceptBidiEvents?: {
      type: 'boolean';
      description: string;
    };
  };
}

const schema: FakePluginSchema = {
  type: 'object',
  title: 'Fake Plugin Configuration',
  description: 'A schema for Fake Plugin arguments',
  properties: {
    'silly-web-server-port': {
      type: 'integer',
      minimum: 1,
      maximum: 65535,
      description: 'The port to use for the fake web server',
    },
    host: {
      type: 'string',
      description: 'The host to use for the fake web server',
    },
    interceptBidiEvents: {
      type: 'boolean',
      description: 'Whether this plugin should intercept/modify/veto BiDi events for demo/testing purposes',
    },
  },
};

export default schema;
