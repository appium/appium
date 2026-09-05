import {Ajv, type ErrorObject, type ValidateFunction} from '../../schema/ajv.js';
import {commonExtManifestProblemsSchema, driverExtManifestProblemsSchema, manifestEnvelopeSchema} from './schema.js';

export interface EnvelopeValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export type ExtManifestProblem = {err: string; val: unknown};

function topLevelProp(error: ErrorObject): string | undefined {
  if (error.keyword === 'required') {
    return error.params.missingProperty as string;
  }
  return error.instancePath.split('/').filter(Boolean)[0];
}

/** Whether `errors` includes a failure of the root value itself (e.g. a string/array/null instead of an object). */
function hasRootTypeError(errors: ErrorObject[]): boolean {
  return errors.some((error) => error.instancePath === '' && error.keyword === 'type');
}

/** Validates parsed `extensions.yaml` and individual extension manifest entries via a dedicated Ajv instance. */
class ManifestValidator {
  private readonly validateEnvelope: ValidateFunction;
  private readonly validateCommonProblems: ValidateFunction;
  private readonly validateDriverProblems: ValidateFunction;

  constructor() {
    // Dedicated instance: manifest validation runs before `AppiumSchema` (lib/schema/schema.ts) is
    // finalized, so that singleton can't be reused here. No `format` keyword, so no ajv-formats.
    const ajv = new Ajv({allErrors: true});
    this.validateEnvelope = ajv.compile(manifestEnvelopeSchema);
    this.validateCommonProblems = ajv.compile(commonExtManifestProblemsSchema);
    this.validateDriverProblems = ajv.compile(driverExtManifestProblemsSchema);
  }

  /**
   * Validates the top-level shape of a parsed `extensions.yaml` document (before migration).
   *
   * @param data - Result of `YAML.parse()` on the manifest file contents
   */
  validateManifestEnvelope(data: unknown): EnvelopeValidationResult {
    const valid = Boolean(this.validateEnvelope(data));
    return {valid, errors: valid ? [] : [...(this.validateEnvelope.errors ?? [])]};
  }

  /** Human-readable summary of ajv errors, tolerating `message` being unset (it's optional on `ErrorObject`). */
  describeValidationErrors(errors: ErrorObject[]): string {
    return errors
      .map((error) => error.message ?? `${error.keyword} error at "${error.instancePath || '/'}"`)
      .join('; ');
  }

  /**
   * Blocking issues for manifest fields shared by all extensions (version, package name, main class).
   *
   * @param extManifest - Manifest entry for one extension
   */
  getCommonManifestProblems(extManifest: unknown): ExtManifestProblem[] {
    // Stored in a variable: branching on the call directly narrows the negative branch to `never`.
    const valid: boolean = this.validateCommonProblems(extManifest);
    if (valid) {
      return [];
    }

    const errors = this.validateCommonProblems.errors ?? [];
    // A root type error means every field is missing; topLevelProp() can't attribute it to one.
    const props = hasRootTypeError(errors)
      ? new Set(['version', 'pkgName', 'mainClass'])
      : new Set(errors.map(topLevelProp));

    // Cast once (extManifest may be non-object/null/undefined), then read safely via `?.`.
    const manifest = extManifest as Record<string, unknown> | null | undefined;
    const problems: ExtManifestProblem[] = [];

    if (props.has('version')) {
      problems.push({
        err: 'Invalid or missing `version` field in my `package.json` and/or `extensions.yaml` (must be a string)',
        val: manifest?.version,
      });
    }
    if (props.has('pkgName')) {
      problems.push({
        err: 'Invalid or missing `name` field in my `package.json` and/or `extensions.yaml` (must be a string)',
        val: manifest?.pkgName,
      });
    }
    if (props.has('mainClass')) {
      problems.push({
        err: 'Invalid or missing `appium.mainClass` field in my `package.json` and/or `mainClass` field in `extensions.yaml` (must be a string)',
        val: manifest?.mainClass,
      });
    }

    return problems;
  }

  /**
   * Blocking issues for driver-specific manifest fields (automationName, platformNames).
   * Does not include the cross-driver duplicate-`automationName` check, which needs state
   * spanning multiple extensions and lives in {@link DriverConfig.getConfigProblems} instead.
   *
   * @param extManifest - Manifest entry for one driver
   */
  getDriverManifestProblems(extManifest: unknown): ExtManifestProblem[] {
    // See the comment in `getCommonManifestProblems` about not narrowing on the call directly.
    const valid: boolean = this.validateDriverProblems(extManifest);
    if (valid) {
      return [];
    }

    const errors = this.validateDriverProblems.errors ?? [];
    // See the comment in `getCommonManifestProblems` about casting once and reading via `?.`.
    const manifest = extManifest as Record<string, unknown> | null | undefined;

    // A root type error means both fields are missing; no per-property error to attribute either to.
    if (hasRootTypeError(errors)) {
      return [
        {err: 'Missing or incorrect supported platformNames list.', val: manifest?.platformNames},
        {err: 'Missing or incorrect automationName', val: manifest?.automationName},
      ];
    }

    const problems: ExtManifestProblem[] = [];
    const platformNamesErrors = errors.filter((error) => topLevelProp(error) === 'platformNames');
    const automationNameErrors = errors.filter((error) => topLevelProp(error) === 'automationName');
    const platformNames = manifest?.platformNames;

    const isMissingOrWrongType = platformNamesErrors.some(
      (error) => error.keyword === 'required' || (error.keyword === 'type' && error.instancePath === '/platformNames'),
    );
    const isEmpty = platformNamesErrors.some((error) => error.keyword === 'minItems');

    if (isMissingOrWrongType) {
      problems.push({err: 'Missing or incorrect supported platformNames list.', val: platformNames});
    } else if (isEmpty) {
      problems.push({err: 'Empty platformNames list.', val: platformNames});
    } else {
      for (const error of platformNamesErrors) {
        if (error.keyword === 'type') {
          const index = Number(error.instancePath.split('/')[2]);
          problems.push({err: 'Incorrectly formatted platformName.', val: (platformNames as unknown[])[index]});
        }
      }
    }

    if (automationNameErrors.length) {
      problems.push({err: 'Missing or incorrect automationName', val: manifest?.automationName});
    }

    return problems;
  }
}

export const manifestValidator = new ManifestValidator();
