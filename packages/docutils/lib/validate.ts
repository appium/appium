/**
 * Validates an environment for building documentation
 *
 * @module
 */

import {fs} from '@appium/support';
import chalk from 'chalk';
import _ from 'lodash';
import {EventEmitter} from 'node:events';
import path from 'node:path';
import pluralize from 'pluralize';
import {satisfies} from 'semver';
import {exec} from 'teen_process';
import {
  DEFAULT_REL_TYPEDOC_OUT_PATH,
  DOCUTILS_PKG,
  NAME_BIN,
  NAME_NPM,
  NAME_PACKAGE_JSON,
  NAME_PIP,
  NAME_PYTHON,
  NAME_REQUIREMENTS_TXT,
  NAME_TSCONFIG_JSON,
  NAME_TYPEDOC,
  NAME_TYPEDOC_JSON,
  NAME_TYPESCRIPT,
  REQUIREMENTS_TXT_PATH,
} from './constants';
import {DocutilsError} from './error';
import {findPkgDir, readJson5, readTypedocJson} from './fs';
import logger from './logger';
import {PipPackage, TypeDocJson} from './model';
import {relative} from './util';

/**
 * Matches the Python version string from `python --version`
 */
const PYTHON_VER_STR = 'Python 3.';

/**
 * Matches the TypeScript version string from `tsc --version`
 */
const TYPESCRIPT_VERSION_REGEX = /Version\s(\d+\.\d+\..+)/;

/**
 * Matches the TypeDoc version string from `typedoc --version`
 */
const TYPEDOC_VERSION_REGEX = /TypeDoc\s(\d+\.\d+\..+)/;

const log = logger.withTag('validate');

/**
 * The "kinds" of validation which were requested to be performed
 */
export type ValidationKind =
  | typeof NAME_PYTHON
  | typeof NAME_TYPESCRIPT
  | typeof NAME_TYPEDOC
  | typeof NAME_NPM;

/**
 * This class is designed to run _all_ validation checks (as requested by the user), and emit events for
 * each failure encountered.
 *
 * Whenever a method _rejects or throws_, this is considered an "unexpected" error, and the validation
 * will abort.
 *
 * @todo Use [`strict-event-emitter-types`](https://npm.im/strict-event-emitter-types)
 */
export class DocutilsValidator extends EventEmitter {
  /**
   * Current working directory. Defaults to `process.cwd()`
   * @todo This cannot yet be overriden by user
   */
  protected readonly cwd: string;

  /**
   * Path to `npm` executable. Defaults to `npm`
   */
  protected readonly npmPath: string;

  /**
   * Path to `python` executable. Defaults to `python`
   */
  protected readonly pythonPath: string;

  /**
   * List of validations to perform
   */
  protected readonly validations = new Set<ValidationKind>();

  /**
   * Mapping of error messages to errors.
   *
   * Used to prevent duplicate emission of errors and track error count; if non-empty, the validation
   * process should be considered to have failed.
   *
   * Reset after {@linkcode DocutilsValidator.validate validate} completes.
   */
  protected emittedErrors = new Map<string, DocutilsError>();

  /**
   * Path to `mkdocs.yml`.  If not provided, will be lazily resolved.
   */
  protected mkDocsYmlPath: string | undefined;

  /**
   * Path to `package.json`.  If not provided, will be lazily resolved.
   */
  protected packageJsonPath: string | undefined;

  /**
   * Path to the package directory.  If not provided, will be lazily resolved.
   */
  protected pkgDir: string | undefined;

  /**
   * Path to `tsconfig.json`.  If not provided, will be lazily resolved.
   */
  protected tsconfigJsonPath: string | undefined;

  /**
   * Path to `typedoc.json`.  If not provided, will be lazily resolved.
   */
  protected typeDocJsonPath: string | undefined;

  /**
   * Emitted when validation begins with a list of validation kinds to be performed
   * @event
   */
  public static readonly BEGIN = 'begin';

  /**
   * Emitted when validation ends with an error count
   * @event
   */
  public static readonly END = 'end';

  /**
   * Emitted when a validation fails, with the associated {@linkcode DocutilsError}
   * @event
   */
  public static readonly FAILURE = 'fail';

  /**
   * Emitted when a validation succeeds
   * @event
   */
  public static readonly SUCCESS = 'ok';

  /**
   * Creates a listener to track errors emitted
   */
  constructor(opts: DocutilsValidatorOpts = {}) {
    super();

    this.packageJsonPath = opts.packageJson;
    this.pythonPath = opts.pythonPath ?? NAME_PYTHON;
    this.cwd = opts.cwd ?? process.cwd();
    this.tsconfigJsonPath = opts.tsconfigJson;
    this.typeDocJsonPath = opts.typedocJson;
    this.npmPath = opts.npm ?? NAME_NPM;
    this.mkDocsYmlPath = opts.mkdocsYml;

    if (opts.python) {
      this.validations.add(NAME_PYTHON);
    }
    if (opts.typescript) {
      this.validations.add(NAME_TYPESCRIPT);
      // npm validation is required for both typescript and typedoc validation
      this.validations.add(NAME_NPM);
    }
    if (opts.typedoc) {
      this.validations.add(NAME_TYPEDOC);
      this.validations.add(NAME_NPM);
    }

    // this just tracks the emitted errors
    this.on(DocutilsValidator.FAILURE, (err: DocutilsError) => {
      this.emittedErrors.set(err.message, err);
    });
  }

  /**
   * Runs the configured validations, then resets internal state upon completion or rejection.
   */
  public async validate() {
    try {
      this.emit(DocutilsValidator.BEGIN, [...this.validations]);

      if (this.validations.has(NAME_PYTHON)) {
        await this.validatePythonVersion();
        await this.validatePythonDeps();
      }

      if (this.validations.has(NAME_NPM)) {
        await this.validateNpmVersion();
      }

      if (this.validations.has(NAME_TYPESCRIPT)) {
        await this.validateTypeScript();
        await this.validateTypeScriptConfig();
      }

      if (this.validations.has(NAME_TYPEDOC)) {
        await this.validateTypeDoc();
        await this.validateTypeDocConfig();
      }

      this.emit(DocutilsValidator.END, this.emittedErrors.size);
    } finally {
      this.reset();
    }
  }

  /**
   * If a thing like `err` has not already been emitted, emit
   * {@linkcode DocutilsValidator.FAILURE}.
   * @param err A validation error
   * @returns
   */
  protected fail(err: DocutilsError) {
    if (!this.emittedErrors.has(err.message)) {
      this.emit(DocutilsValidator.FAILURE, err);
    }
  }

  /**
   * Resolves with a the parent directory of `package.json`, if we can find it.
   */
  protected async findPkgDir(): Promise<string | undefined> {
    return (
      this.pkgDir ??
      (this.pkgDir = this.packageJsonPath
        ? path.dirname(this.packageJsonPath)
        : await findPkgDir(this.cwd))
    );
  }

  /**
   * Emits a {@linkcode DocutilsValidator.SUCCESS} event
   * @param message Success message
   */
  protected ok(message: string) {
    this.emit(DocutilsValidator.SUCCESS, message);
  }

  /**
   * Parses a `requirements.txt` file and returns an array of packages
   * @param requirementsTxtPath Path to `requirements.txt`
   * @returns List of package data w/ name and version
   */
  protected async parseRequirementsTxt(
    requirementsTxtPath = REQUIREMENTS_TXT_PATH
  ): Promise<PipPackage[]> {
    let requiredPackages: PipPackage[] = [];

    try {
      let requirementsTxt = await fs.readFile(requirementsTxtPath, 'utf8');
      requirementsTxt = requirementsTxt.trim();
      log.debug('Raw %s: %s', NAME_REQUIREMENTS_TXT, requirementsTxt);
      for (const line of requirementsTxt.split(/\r?\n/)) {
        const [name, version] = line.trim().split('==');
        log.debug('Need Python package %s @ %s', name, version);
        requiredPackages.push({name, version});
      }
      log.debug('Parsed %s: %O', NAME_REQUIREMENTS_TXT, requiredPackages);
    } catch {
      throw new DocutilsError(`Could not find ${requirementsTxtPath}. This is a bug`);
    }

    return requiredPackages;
  }

  /**
   * Resets the cache of emitted errors
   */
  protected reset() {
    this.emittedErrors.clear();
  }

  /**
   * @todo implement
   */
  protected async validateMkDocs() {}

  /**
   * Validates that the version of `npm` matches what's described in this package's `engines` field.
   *
   * This is required because other validators need `npm exec` to work, which is only available in npm 7+.
   */
  protected async validateNpmVersion() {
    const npmEngineRange = DOCUTILS_PKG.engines?.npm;
    if (!npmEngineRange) {
      throw new DocutilsError('Could not find property engines.npm in package.json. This is a bug');
    }
    try {
      const {stdout: npmVersion} = await exec(this.npmPath, ['-v']);
      if (!satisfies(npmVersion.trim(), npmEngineRange)) {
        this.fail(
          new DocutilsError(
            `${NAME_NPM} is version ${npmVersion}, but ${npmEngineRange} is required`
          )
        );
        return;
      }
    } catch {
      this.fail(new DocutilsError(`Could not find ${this.npmPath} in PATH. Is it installed?`));
      return;
    }
    this.ok(`${NAME_NPM} version OK`);
  }

  /**
   * Asserts that the dependencies as listed in `requirements.txt` are installed.
   *
   * @privateRemarks This lists all installed packages with `pip` and then compares them to the
   * contents of our `requirements.txt`. Versions _must_ match exactly.
   */
  protected async validatePythonDeps() {
    let pipListOutput: string;
    try {
      ({stdout: pipListOutput} = await exec(this.pythonPath, [
        '-m',
        NAME_PIP,
        'list',
        '--format',
        'json',
      ]));
    } catch {
      this.fail(new DocutilsError(`Could not find ${NAME_PIP} in PATH. Is it installed?`));
      return;
    }

    let installedPkgs: PipPackage[];
    try {
      installedPkgs = JSON.parse(pipListOutput) as PipPackage[];
    } catch {
      throw new DocutilsError(
        `Could not parse output of "${NAME_PIP} list" as JSON: ${pipListOutput}`
      );
    }

    const pkgsByName = _.mapValues(_.keyBy(installedPkgs, 'name'), 'version');
    log.debug('Installed Python packages: %O', pkgsByName);

    const requiredPackages = await this.parseRequirementsTxt();
    const missingPackages: PipPackage[] = [];
    const invalidVersionPackages: [expected: PipPackage, actual: PipPackage][] = [];
    for (const reqdPkg of requiredPackages) {
      const version = pkgsByName[reqdPkg.name];
      if (!version) {
        missingPackages.push(reqdPkg);
      }
      if (version !== reqdPkg.version) {
        invalidVersionPackages.push([reqdPkg, {name: reqdPkg.name, version}]);
      }
    }

    const msgParts = [];
    if (missingPackages.length) {
      msgParts.push(
        `The following required ${pluralize(
          'package',
          missingPackages.length
        )} could not be found:\n${missingPackages
          .map((p) => chalk`- {yellow ${p.name}} @ {yellow ${p.version}}`)
          .join('\n')}`
      );
    }
    if (invalidVersionPackages.length) {
      msgParts.push(
        `The following required ${pluralize(
          'package',
          invalidVersionPackages.length
        )} are installed, but at the wrong version:\n${invalidVersionPackages
          .map(
            ([expected, actual]) =>
              chalk`- {yellow ${expected.name}} @ {yellow ${expected.version}} (found {red ${actual.version}})`
          )
          .join('\n')}`
      );
    }
    if (msgParts.length) {
      this.fail(
        new DocutilsError(
          `Required Python dependency validation failed:\n\n${msgParts.join('\n\n')}`
        )
      );
      return;
    }

    this.ok('Python dependencies OK');
  }

  /**
   * Asserts that the Python version is 3.x
   */
  protected async validatePythonVersion() {
    try {
      const {stdout} = await exec(this.pythonPath, ['--version']);
      if (!stdout.includes(PYTHON_VER_STR)) {
        this.fail(
          new DocutilsError(
            `Could not find Python 3.x in PATH; found ${stdout}.  Please use --python-path`
          )
        );
        return;
      }
    } catch {
      this.fail(new DocutilsError(`Could not find Python 3.x in PATH.`));
      return;
    }
    this.ok('Python version OK');
  }

  /**
   * Asserts TypeDoc is installed, runnable, the correct version, and that the config file is readable
   * and constaints required options
   */
  protected async validateTypeDoc() {
    const pkgDir = await this.findPkgDir();
    let rawTypeDocVersion: string;
    let typeDocVersion: string;
    try {
      ({stdout: rawTypeDocVersion} = await exec('npm', ['exec', NAME_TYPEDOC, '--', '--version'], {
        cwd: pkgDir,
      }));
    } catch {
      this.fail(new DocutilsError(`Could not find ${NAME_TYPEDOC} executable from ${pkgDir}`));
      return;
    }

    if (rawTypeDocVersion) {
      let match = rawTypeDocVersion.match(TYPEDOC_VERSION_REGEX);
      if (match) {
        typeDocVersion = match[1];
      } else {
        throw new DocutilsError(
          `Could not parse TypeDoc version from "typedoc --version"; output was:\n ${rawTypeDocVersion}`
        );
      }

      const reqdTypeDocVersion = DOCUTILS_PKG.dependencies!.typedoc!;
      if (!satisfies(typeDocVersion, reqdTypeDocVersion)) {
        this.fail(
          new DocutilsError(
            `Found TypeDoc version ${typeDocVersion}, but ${reqdTypeDocVersion} is required`
          )
        );
        return;
      }
      this.ok('TypeDoc install OK');
    }
  }

  /**
   * Validates the `typedoc.json` file
   */
  protected async validateTypeDocConfig() {
    const pkgDir = await this.findPkgDir();
    if (!pkgDir) {
      this.fail(new DocutilsError(`Could not find package.json in ${this.cwd}`));
      return;
    }
    const typeDocJsonPath = (this.typeDocJsonPath =
      this.typeDocJsonPath ?? path.join(pkgDir, NAME_TYPEDOC_JSON));
    const relTypeDocJsonPath = relative(this.cwd, typeDocJsonPath);
    let typeDocJson: TypeDocJson;

    // handle the case where the user passes a JS file as the typedoc config
    // (which is allowed by TypeDoc)
    if (typeDocJsonPath.endsWith('.js')) {
      try {
        typeDocJson = require(typeDocJsonPath);
      } catch (err) {
        throw new DocutilsError(
          `TypeDoc config at ${relTypeDocJsonPath} threw an exception: ${err}`
        );
      }
    } else {
      try {
        typeDocJson = readTypedocJson(typeDocJsonPath);
      } catch (e) {
        if (e instanceof SyntaxError) {
          return this.fail(
            new DocutilsError(`Unparseable ${NAME_TYPEDOC_JSON} at ${relTypeDocJsonPath}: ${e}`)
          );
        }
        return this.fail(
          new DocutilsError(
            `Missing ${NAME_TYPEDOC_JSON} at ${relTypeDocJsonPath}; "${NAME_BIN} init" can help`
          )
        );
      }
    }

    if (!typeDocJson.out) {
      return this.fail(
        new DocutilsError(
          `Missing "out" property in ${relTypeDocJsonPath}; path "${DEFAULT_REL_TYPEDOC_OUT_PATH} is recommended`
        )
      );
    }

    this.ok('TypeDoc config OK');
  }

  /**
   * Asserts that TypeScript is installed, runnable, the correct version, and a parseable `tsconfig.json` exists.
   */
  protected async validateTypeScript() {
    const pkgDir = await this.findPkgDir();
    if (!pkgDir) {
      return this.fail(new DocutilsError(`Could not find package.json in ${this.cwd}`));
    }
    let typeScriptVersion: string;
    let rawTypeScriptVersion: string;
    try {
      ({stdout: rawTypeScriptVersion} = await exec(NAME_NPM, ['exec', 'tsc', '--', '--version'], {
        cwd: pkgDir,
      }));
    } catch {
      return this.fail(
        new DocutilsError(`Could not find TypeScript compiler ("tsc") from ${pkgDir}`)
      );
    }

    let match = rawTypeScriptVersion.match(TYPESCRIPT_VERSION_REGEX);
    if (match) {
      typeScriptVersion = match[1];
    } else {
      return this.fail(
        new DocutilsError(
          `Could not parse TypeScript version from "tsc --version"; output was:\n ${rawTypeScriptVersion}`
        )
      );
    }

    const reqdTypeScriptVersion = DOCUTILS_PKG.dependencies?.typescript;

    if (!reqdTypeScriptVersion) {
      throw new DocutilsError(
        `Could not find a dep for ${NAME_TYPESCRIPT} in ${NAME_PACKAGE_JSON}. This is a bug.`
      );
    }

    if (!satisfies(typeScriptVersion, reqdTypeScriptVersion)) {
      return this.fail(
        new DocutilsError(
          `Found TypeScript version ${typeScriptVersion}, but ${reqdTypeScriptVersion} is required`
        )
      );
    }
    this.ok('TypeScript install OK');
  }

  protected async validateTypeScriptConfig() {
    const pkgDir = await this.findPkgDir();
    if (!pkgDir) {
      return this.fail(new DocutilsError(`Could not find package.json in ${this.cwd}`));
    }
    const tsconfigJsonPath = (this.tsconfigJsonPath =
      this.tsconfigJsonPath ?? path.join(pkgDir, NAME_TSCONFIG_JSON));
    const relTsconfigJsonPath = relative(this.cwd, tsconfigJsonPath);
    try {
      await readJson5(tsconfigJsonPath);
    } catch (e) {
      if (e instanceof SyntaxError) {
        return this.fail(
          new DocutilsError(`Unparseable ${NAME_TSCONFIG_JSON} at ${relTsconfigJsonPath}: ${e}`)
        );
      }
      return this.fail(
        new DocutilsError(
          `Missing ${NAME_TSCONFIG_JSON} at ${relTsconfigJsonPath}; "${NAME_BIN} init" can help`
        )
      );
    }

    this.ok('TypeScript config OK');
  }
}

/**
 * Options for {@linkcode DocutilsValidator} constructor
 */

export interface DocutilsValidatorOpts {
  /**
   * Current working directory
   */
  cwd?: string;
  /**
   * Path to `mkdocs.yml`
   */
  mkdocsYml?: string;
  /**
   * Path to `npm` executable
   */
  npm?: string;
  /**
   * Path to `package.json`
   */
  packageJson?: string;
  /**
   * If `true`, run Python validation
   */
  python?: boolean;
  /**
   * Path to `python` executable
   */
  pythonPath?: string;
  /**
   * Path to `tsconfig.json`
   */
  tsconfigJson?: string;
  /**
   * If `true`, run TypeDoc validation
   */
  typedoc?: boolean;
  /**
   * Path to `typedoc.json`
   */
  typedocJson?: string;
  /**
   * If `true`, run TypeScript validation
   */
  typescript?: boolean;
}
