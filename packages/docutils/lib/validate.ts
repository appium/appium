/**
 * Validates an environment for building documentation; used by `validate` command
 *
 * @module
 */

import {fs, util} from '@appium/support';
import chalk from 'chalk';
import _ from 'lodash';
import {EventEmitter} from 'node:events';
import {exec} from 'teen_process';
import {
  MESSAGE_PYTHON_MISSING,
  NAME_BIN,
  NAME_ERR_ENOENT,
  NAME_MKDOCS,
  NAME_MKDOCS_YML,
  NAME_PIP,
  NAME_PYTHON,
  NAME_REQUIREMENTS_TXT,
  REQUIREMENTS_TXT_PATH,
} from './constants';
import {DocutilsError} from './error';
import {
  findMkDocsYml,
  isMkDocsInstalled,
  readMkDocsYml,
  findPython,
} from './fs';
import {getLogger} from './logger';
import {MkDocsYml, PipPackage} from './model';

/**
 * Matches the Python version string from `python --version`
 */
const PYTHON_VER_STR = 'Python 3.';

/**
 * Matches the MkDocs version string from `mkdocs --version`
 */
const MKDOCS_VERSION_REGEX = /\s+version\s+(\d+\.\d+\.\S+)/;

const log = getLogger('validate');

/**
 * The "kinds" of validation which were requested to be performed
 */
export type ValidationKind = typeof NAME_PYTHON | typeof NAME_MKDOCS;

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
   * @todo This cannot yet be overridden by user
   */
  protected readonly cwd: string;

  /**
   * Path to `python` executable.
   */
  protected readonly pythonPath?: string;

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
  protected mkDocsYmlPath?: string;

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

  private requirementsTxt: PipPackage[] | undefined;

  /**
   * Creates a listener to track errors emitted
   */
  constructor(opts: DocutilsValidatorOpts = {}) {
    super();

    this.pythonPath = opts.pythonPath;
    this.cwd = opts.cwd ?? process.cwd();
    this.mkDocsYmlPath = opts.mkdocsYml;

    if (opts.python) {
      this.validations.add(NAME_PYTHON);
    }
    if (opts.mkdocs) {
      this.validations.add(NAME_MKDOCS);
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

      if (this.validations.has(NAME_MKDOCS)) {
        await this.validateMkDocs();
        await this.validateMkDocsConfig();
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
  protected fail(err: DocutilsError | string) {
    const dErr = _.isString(err) ? new DocutilsError(err) : err;
    if (!this.emittedErrors.has(dErr.message)) {
      this.emit(DocutilsValidator.FAILURE, dErr);
    }
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
   *
   * Caches the result.
   * @returns List of package data w/ name and version
   */
  protected async parseRequirementsTxt(): Promise<PipPackage[]> {
    if (this.requirementsTxt) {
      return this.requirementsTxt;
    }

    const requiredPackages: PipPackage[] = [];

    try {
      let requirementsTxt = await fs.readFile(REQUIREMENTS_TXT_PATH, 'utf8');
      requirementsTxt = requirementsTxt.trim();
      log.debug('Raw %s: %s', NAME_REQUIREMENTS_TXT, requirementsTxt);
      for (const line of requirementsTxt.split(/\r?\n/)) {
        const [name, version] = line.trim().split('==');
        requiredPackages.push({name, version});
      }
      log.debug('Parsed %s: %O', NAME_REQUIREMENTS_TXT, requiredPackages);
    } catch {
      throw new DocutilsError(`Could not find ${REQUIREMENTS_TXT_PATH}. This is a bug`);
    }

    return (this.requirementsTxt = requiredPackages);
  }

  /**
   * Resets the cache of emitted errors
   */
  protected reset() {
    this.emittedErrors.clear();
  }

  /**
   * Validates that the correct version of `mkdocs` is installed
   */
  protected async validateMkDocs() {
    log.debug(`Validating MkDocs version`);

    const pythonPath = this.pythonPath ?? (await findPython());
    if (!pythonPath) {
      return this.fail(MESSAGE_PYTHON_MISSING);
    }

    const mkdocsInstalled = await isMkDocsInstalled();
    if (!mkdocsInstalled) {
      return this.fail(`Could not find MkDocs executable; please run "${NAME_BIN} init"`);
    }

    let rawMkDocsVersion: string | undefined;
    try {
      ({stdout: rawMkDocsVersion} = await exec(pythonPath, ['-m', NAME_MKDOCS, '--version']));
    } catch (err) {
      return this.fail(`Failed to get MkDocs version: ${err}`);
    }
    const match = rawMkDocsVersion.match(MKDOCS_VERSION_REGEX);
    if (!match) {
      return this.fail(`Could not parse MkDocs version. Output was ${rawMkDocsVersion}`);
    }
    const version = match[1];
    const reqs = await this.parseRequirementsTxt();
    const mkDocsPipPkg = _.find(reqs, {name: NAME_MKDOCS});
    if (!mkDocsPipPkg) {
      throw new DocutilsError(
        `No ${NAME_MKDOCS} package in ${REQUIREMENTS_TXT_PATH}. This is a bug`,
      );
    }
    const {version: mkDocsReqdVersion} = mkDocsPipPkg;
    if (version !== mkDocsReqdVersion) {
      return this.fail(`MkDocs v${version} is installed, but v${mkDocsReqdVersion} is required`);
    }

    this.ok('MkDocs install OK');
  }

  /**
   * Validates (sort of) an `mkdocs.yml` config file.
   *
   * It checks if the file exists, if it can be parsed as YAML, and if it has a `site_name` property.
   */
  protected async validateMkDocsConfig() {
    log.debug(`Validating ${NAME_MKDOCS_YML}`);

    const mkDocsYmlPath = this.mkDocsYmlPath ?? (await findMkDocsYml(this.cwd));
    if (!mkDocsYmlPath) {
      return this.fail(
        `Could not find ${NAME_MKDOCS_YML} from ${this.cwd}; please run "${NAME_BIN} init"`,
      );
    }

    let mkDocsYml: MkDocsYml;
    try {
      mkDocsYml = await readMkDocsYml(mkDocsYmlPath);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === NAME_ERR_ENOENT) {
        return this.fail(
          `Could not find ${NAME_MKDOCS_YML} at ${mkDocsYmlPath}. Use --mkdocs-yml to specify a different path.`,
        );
      }
      return this.fail(`Could not parse ${mkDocsYmlPath}: ${err}`);
    }

    if (!mkDocsYml.site_name) {
      return this.fail(`Could not find required property "site_name" in ${mkDocsYmlPath}`);
    }

    this.ok(`MkDocs config at ${mkDocsYmlPath} OK`);
  }

  /**
   * Asserts that the dependencies as listed in `requirements.txt` are installed.
   *
   * @privateRemarks This lists all installed packages with `pip` and then compares them to the
   * contents of our `requirements.txt`. Versions _must_ match exactly.
   */
  protected async validatePythonDeps() {
    log.debug(`Validating required ${NAME_PYTHON} package versions`);

    const pythonPath = this.pythonPath ?? (await findPython());
    if (!pythonPath) {
      return this.fail(MESSAGE_PYTHON_MISSING);
    }

    let pipListOutput: string;
    try {
      ({stdout: pipListOutput} = await exec(pythonPath, [
        '-m',
        NAME_PIP,
        'list',
        '--format',
        'json',
      ]));
    } catch {
      return this.fail(
        `Could not find ${NAME_PIP} installation for Python at ${pythonPath}. Is it installed?`
      );
    }

    let installedPkgs: PipPackage[];
    try {
      installedPkgs = JSON.parse(pipListOutput) as PipPackage[];
    } catch {
      return this.fail(`Could not parse output of "${NAME_PIP} list" as JSON: ${pipListOutput}`);
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
      } else if (version !== reqdPkg.version) {
        invalidVersionPackages.push([reqdPkg, {name: reqdPkg.name, version}]);
      }
    }

    const msgParts = [];
    if (missingPackages.length) {
      msgParts.push(
        `The following required ${util.pluralize(
          'package',
          missingPackages.length,
        )} could not be found:\n${missingPackages
          .map((p) => chalk`- {yellow ${p.name}} @ {yellow ${p.version}}`)
          .join('\n')}`,
      );
    }
    if (invalidVersionPackages.length) {
      msgParts.push(
        `The following required ${util.pluralize(
          'package',
          invalidVersionPackages.length,
        )} are installed, but at the wrong version:\n${invalidVersionPackages
          .map(
            ([expected, actual]) =>
              chalk`- {yellow ${expected.name}} @ {yellow ${expected.version}} (found {red ${actual.version}})`,
          )
          .join('\n')}`,
      );
    }
    if (msgParts.length) {
      return this.fail(`Required Python dependency validation failed:\n\n${msgParts.join('\n\n')}`);
    }

    this.ok('Python dependencies OK');
  }

  /**
   * Asserts that the Python version is 3.x
   */
  protected async validatePythonVersion() {
    log.debug(`Validating ${NAME_PYTHON} version`);

    const pythonPath = this.pythonPath ?? (await findPython());
    if (!pythonPath) {
      return this.fail(MESSAGE_PYTHON_MISSING);
    }

    try {
      const {stdout} = await exec(pythonPath, ['--version']);
      if (!stdout.includes(PYTHON_VER_STR)) {
        return this.fail(`Could not find Python 3.x in PATH; found ${stdout}`);
      }
    } catch {
      return this.fail(`Could not retrieve Python version`);
    }
    this.ok('Python version OK');
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
   * If `true`, run Python validation
   */
  python?: boolean;
  /**
   * Path to `python` executable
   */
  pythonPath?: string;
  /**
   * If `true`, run MkDocs validation
   */
  mkdocs?: boolean;
}
