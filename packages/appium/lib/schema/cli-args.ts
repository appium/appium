import {ArgumentTypeError, type ArgumentOptions} from 'argparse';
import _ from 'lodash';
import type {JSONSchema7, JSONSchema7TypeName} from 'json-schema';
import {formatErrors} from '../config-file';
import {flattenSchema, validate} from './schema';
import {transformers, parseCsvLine} from './cli-transformers';
import type {ArgSpec} from './arg-spec';
import type {AppiumJSONSchemaKeywords, AppiumCliTransformerName} from './keywords';
import type {ArgumentDefinitions} from '../cli/args';

type AppiumJSONSchema = AppiumJSONSchemaKeywords & JSONSchema7;
type ArgDef = [[string] | [string, string], ArgumentOptions];

const TYPENAMES: Readonly<Record<string, JSONSchema7TypeName>> = Object.freeze({
  ARRAY: 'array',
  OBJECT: 'object',
  BOOLEAN: 'boolean',
  INTEGER: 'integer',
  NUMBER: 'number',
  NULL: 'null',
  STRING: 'string',
});

const SHORT_ARG_CUTOFF = 3;

/**
 * Converts the finalized, flattened schema representation into
 * `ArgumentDefinitions` for handoff to `argparse`.
 */
export function toParserArgs(): ArgumentDefinitions {
  const flattened = flattenSchema().filter(({schema}) => !schema.appiumCliIgnored);
  return new Map(
    _.map(flattened, ({schema, argSpec}) => subSchemaToArgDef(schema as AppiumJSONSchema, argSpec))
  );
}

/**
 * Convert an alias (`foo`) to a flag (`--foo`) or short flag (`-f`).
 */
function aliasToFlag(argSpec: ArgSpec, alias?: string): string {
  const {extType, extName, name} = argSpec;
  const arg = alias ?? name;
  const isShort = arg.length < SHORT_ARG_CUTOFF;
  if (extType && extName) {
    return isShort
      ? `--${extType}-${_.kebabCase(extName)}-${arg}`
      : `--${extType}-${_.kebabCase(extName)}-${_.kebabCase(arg)}`;
  }
  return isShort ? `-${arg}` : `--${_.kebabCase(arg)}`;
}

const screamingSnakeCase = _.flow(_.snakeCase, _.toUpper);

/**
 * Given an argument spec, return a validator/coercer function backed by schema validation.
 */
function getSchemaValidator<Coerced>(
  {ref: schemaId}: ArgSpec,
  coerce: (value: string) => Coerced = _.identity as (value: string) => Coerced
): (value: string) => Coerced {
  return (value) => {
    const coerced = coerce(value);
    const errors = validate(coerced, schemaId);
    if (_.isEmpty(errors)) {
      return coerced;
    }
    throw new ArgumentTypeError('\n\n' + formatErrors(errors, value, {schemaId}));
  };
}

function makeDescription(schema: AppiumJSONSchema): string {
  const {appiumCliDescription, description = '', appiumDeprecated} = schema;
  let desc = appiumCliDescription ?? description;
  if (appiumDeprecated) {
    desc = `[DEPRECATED] ${desc}`;
  }
  return desc;
}

function subSchemaToArgDef(subSchema: AppiumJSONSchema, argSpec: ArgSpec): ArgDef {
  const {type, appiumCliAliases, appiumCliTransformer, enum: enumValues} = subSchema;
  const {name, arg} = argSpec;

  const aliases = [
    aliasToFlag(argSpec),
    ...((appiumCliAliases ?? []) as string[]).map((alias) => aliasToFlag(argSpec, alias)),
  ];

  const argOpts: ArgumentOptions = {
    required: false,
    help: makeDescription(subSchema),
  };

  if (!argSpec.extType) {
    argOpts.dest = argSpec.rawDest;
  }

  let argTypeFunction: ((value: string) => unknown) | undefined;

  switch (type) {
    case TYPENAMES.BOOLEAN: {
      argOpts.action = 'store_const';
      argOpts.const = true;
      break;
    }
    case TYPENAMES.OBJECT: {
      argTypeFunction = _.flow(transformers.json, (o) => {
        if (!_.isPlainObject(o)) {
          throw new ArgumentTypeError(`'${_.truncate(String(o), {length: 100})}' must be a plain object`);
        }
        return o;
      });
      break;
    }
    case TYPENAMES.ARRAY: {
      argTypeFunction = parseCsvLine;
      break;
    }
    case TYPENAMES.NUMBER: {
      argTypeFunction = getSchemaValidator(argSpec, parseFloat);
      break;
    }
    case TYPENAMES.INTEGER: {
      argTypeFunction = getSchemaValidator(argSpec, _.parseInt);
      break;
    }
    case TYPENAMES.STRING: {
      argTypeFunction = getSchemaValidator(argSpec);
      break;
    }
    case TYPENAMES.NULL:
    default: {
      throw new TypeError(`Schema property "${arg}": \`${type}\` type unknown or disallowed`);
    }
  }

  if (type !== TYPENAMES.BOOLEAN) {
    argOpts.metavar = screamingSnakeCase(name);
  }

  if (appiumCliTransformer && transformers[appiumCliTransformer as AppiumCliTransformerName]) {
    if (type === TYPENAMES.ARRAY) {
      const csvTransformer = argTypeFunction as (x: string) => string[];
      argTypeFunction = (val) =>
        _.flatMap(csvTransformer(val).map(transformers[appiumCliTransformer as AppiumCliTransformerName]));
    } else {
      argTypeFunction = _.flow(
        argTypeFunction ?? _.identity,
        transformers[appiumCliTransformer as AppiumCliTransformerName]
      ) as (value: string) => unknown;
    }
  }

  if (argTypeFunction) {
    argOpts.type = argTypeFunction;
  }

  if (enumValues && !_.isEmpty(enumValues)) {
    if (type === TYPENAMES.STRING) {
      argOpts.choices = enumValues.map(String);
    } else {
      throw new TypeError(
        `Problem with schema for ${arg}; \`enum\` is only supported for \`type: 'string'\``
      );
    }
  }

  const finalAliases = aliases as [string] | [string, string];
  return [finalAliases, argOpts];
}

