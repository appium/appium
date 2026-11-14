import type {SchemaObject} from '../../schema/ajv.js';

/**
 * Shallow shape of the parsed `extensions.yaml` document. Deliberately permissive about the
 * shape of individual `drivers`/`plugins` entries (see {@link commonExtManifestProblemsSchema}
 * and {@link driverExtManifestProblemsSchema}) so that old-but-valid manifest revisions are
 * never rejected here; that's `Manifest.read()`'s job before per-extension validation runs.
 */
export const manifestEnvelopeSchema: SchemaObject = {
  type: 'object',
  required: ['drivers', 'plugins'],
  properties: {
    drivers: {type: 'object'},
    plugins: {type: 'object'},
    schemaRev: {type: 'integer'},
  },
};

/** Fields required of every extension manifest entry, regardless of driver/plugin kind. */
export const commonExtManifestProblemsSchema: SchemaObject = {
  type: 'object',
  required: ['version', 'pkgName', 'mainClass'],
  properties: {
    version: {type: 'string'},
    pkgName: {type: 'string'},
    mainClass: {type: 'string'},
  },
};

/** Additional fields required of driver manifest entries. */
export const driverExtManifestProblemsSchema: SchemaObject = {
  type: 'object',
  required: ['automationName', 'platformNames'],
  properties: {
    automationName: {type: 'string'},
    platformNames: {
      type: 'array',
      minItems: 1,
      items: {type: 'string'},
    },
  },
};
