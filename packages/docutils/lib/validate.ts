import {satisfies} from 'semver';
import path from 'node:path';
import {fs} from '@appium/support';
import _ from 'lodash';
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
  NAME_TYPEDOC_JSON,
  REQUIREMENTS_TXT_PATH,
} from './constants';
import {DocutilsError} from './error';
import {PipPackage, TypeDocJson} from './model';
import {findPkgDir, readJson, readJson5, relative} from './util';
import logger from './logger';

const PYTHON_VER_STR = 'Python 3.';
const TYPESCRIPT_VERSION_REGEX = /Version\s(\d+\.\d+\..+)/;
const TYPEDOC_VERSION_REGEX = /TypeDoc\s(\d+\.\d+\..+)/;
const log = logger.withTag('validate');

async function parseRequirementsTxt(requirementsTxtPath = REQUIREMENTS_TXT_PATH) {
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

export async function assertPythonVersion(pythonPath = NAME_PYTHON) {
  try {
    const {stdout} = await exec(pythonPath, ['-V']);
    if (!stdout.includes(PYTHON_VER_STR)) {
      throw new DocutilsError(
        `Could not find Python 3.x in PATH; found ${stdout}.  Please use --python-path`
      );
    }
    log.success('Python version OK');
  } catch {
    throw new DocutilsError(`Could not find Python 3.x in PATH. Is it installed?`);
  }
}

export async function assertPythonDependencies(pythonPath = NAME_PYTHON) {
  let pipListOutput: string;
  try {
    ({stdout: pipListOutput} = await exec(pythonPath, ['-m', 'pip', 'list', '--format', 'json']));
  } catch {
    throw new DocutilsError(`Could not find ${NAME_PIP} in PATH. Is it installed?`);
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

  const requiredPackages = await parseRequirementsTxt();
  for (const reqdPkg of requiredPackages) {
    const version = pkgsByName[reqdPkg.name];
    if (!version) {
      throw new DocutilsError(
        `Required Python package ${reqdPkg.name} @ ${reqdPkg.version} is not installed; "${NAME_BIN} init" can help`
      );
    }
    if (version !== reqdPkg.version) {
      throw new DocutilsError(
        `Required Python package ${reqdPkg.name} @ ${reqdPkg.version} is installed, but ${version} is installed instead`
      );
    }
  }
  log.success('Python dependencies OK');
}

export async function assertNpmVersion(npmPath = NAME_NPM) {
  const npmEngineRange = DOCUTILS_PKG.engines!.npm!;
  try {
    const {stdout: npmVersion} = await exec(npmPath, ['-v']);
    if (!satisfies(npmVersion.trim(), npmEngineRange)) {
      throw new DocutilsError(
        `${NAME_NPM} is version ${npmVersion}, but ${npmEngineRange} is required`
      );
    }
  } catch {
    throw new DocutilsError(`Could not find ${npmPath} in PATH. Is it installed?`);
  }
  log.success('npm version OK');
}

async function requirePkgDir(cwd = process.cwd(), packageJsonPath?: string) {
  const pkgDir = packageJsonPath ? path.dirname(packageJsonPath) : await findPkgDir(cwd);

  if (!pkgDir) {
    throw new DocutilsError(`Could not find ${NAME_PACKAGE_JSON} from ${cwd}`);
  }
  return pkgDir;
}

/**
 * Asserts that TypeScript is installed, runnable, the correct version, and a parseable `tsconfig.json` exists.
 * @param opts Path options
 */
export async function assertTypeScript({
  cwd = process.cwd(),
  packageJsonPath,
  tsconfigJsonPath,
}: AssertTypeScriptOpts = {}) {
  const pkgDir = await requirePkgDir(cwd, packageJsonPath);

  let typeScriptVersion: string;
  let rawTypeScriptVersion: string;
  try {
    ({stdout: rawTypeScriptVersion} = await exec('npm', ['exec', 'tsc', '--', '--version'], {
      cwd: pkgDir,
    }));
  } catch {
    throw new DocutilsError(`Could not find TypeScript compiler ("tsc") from ${pkgDir}`);
  }

  let match = rawTypeScriptVersion.match(TYPESCRIPT_VERSION_REGEX);
  if (match) {
    typeScriptVersion = match[1];
  } else {
    throw new DocutilsError(
      `Could not parse TypeScript version from "tsc --version"; output was:\n ${rawTypeScriptVersion}`
    );
  }

  const reqdTypeScriptVersion = DOCUTILS_PKG.dependencies!.typescript!;

  if (!satisfies(typeScriptVersion, reqdTypeScriptVersion)) {
    throw new DocutilsError(
      `Found TypeScript version ${typeScriptVersion}, but ${reqdTypeScriptVersion} is required`
    );
  }
  log.success('TypesScript install OK');
  tsconfigJsonPath = tsconfigJsonPath ?? path.join(pkgDir, NAME_TSCONFIG_JSON);
  const relTsconfigJsonPath = relative(cwd, tsconfigJsonPath);
  try {
    await readJson5(tsconfigJsonPath);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new DocutilsError(`Unparseable ${NAME_TSCONFIG_JSON} at ${relTsconfigJsonPath}: ${e}`);
    }
    throw new DocutilsError(
      `Missing ${NAME_TSCONFIG_JSON} at ${relTsconfigJsonPath}; "${NAME_BIN} init" can help`
    );
  }

  log.success('TypeScript config OK');
}

/**
 * Asserts TypeDoc is installed, runnable, the correct version, and that the config file is readable
 * and constaints required options
 * @param opts Path options
 */
export async function assertTypeDoc({
  cwd = process.cwd(),
  packageJsonPath,
  typeDocJsonPath: typeDocJsonPath,
}: AssertTypeDocOpts = {}) {
  const pkgDir = await requirePkgDir(cwd, packageJsonPath);
  let rawTypeDocVersion: string;
  let typeDocVersion: string;
  try {
    ({stdout: rawTypeDocVersion} = await exec('npm', ['exec', 'typedoc', '--', '--version'], {
      cwd: pkgDir,
    }));
  } catch {
    throw new DocutilsError(`Could not find "typedoc" executable from ${pkgDir}`);
  }

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
    throw new DocutilsError(
      `Found TypeDoc version ${typeDocVersion}, but ${reqdTypeDocVersion} is required`
    );
  }
  log.success('TypeDoc install OK');

  typeDocJsonPath = typeDocJsonPath ?? path.join(pkgDir, NAME_TYPEDOC_JSON);
  const relTypeDocJsonPath = relative(cwd, typeDocJsonPath);
  let typeDocJson: TypeDocJson;

  // handle the case where the user passes a JS file as the typedoc config
  // (which is allowed by TypeDoc)
  if (typeDocJsonPath?.endsWith('.js')) {
    try {
      typeDocJson = require(typeDocJsonPath);
    } catch (err) {
      throw new DocutilsError(`TypeDoc config at ${relTypeDocJsonPath} threw an exception: ${err}`);
    }
  } else {
    try {
      typeDocJson = await readJson(typeDocJsonPath);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new DocutilsError(`Unparseable ${NAME_TYPEDOC_JSON} at ${relTypeDocJsonPath}: ${e}`);
      }
      throw new DocutilsError(
        `Missing ${NAME_TYPEDOC_JSON} at ${relTypeDocJsonPath}; "${NAME_BIN} init" can help`
      );
    }
  }

  if (!typeDocJson.out) {
    throw new DocutilsError(
      `Missing "out" property in ${relTypeDocJsonPath}; path "${DEFAULT_REL_TYPEDOC_OUT_PATH} is recommended`
    );
  }

  log.success('TypeDoc config OK');
}

export async function assertPython({pythonPath}: AssertPythonOpts = {}) {
  await assertPythonVersion(pythonPath);
  await assertPythonDependencies(pythonPath);
}

export interface AssertPythonOpts {
  pythonPath?: string;
}

export interface AssertTypeScriptOpts {
  cwd?: string;
  packageJsonPath?: string;
  tsconfigJsonPath?: string;
}

export interface AssertTypeDocOpts {
  cwd?: string;
  packageJsonPath?: string;
  typeDocJsonPath?: string;
}

export async function validate({
  packageJson: packageJsonPath,
  pythonPath,
  python,
  typedoc,
  typescript,
  tsconfigJson: tsconfigJsonPath,
  typedocJson: typeDocJsonPath,
}: ValidateOpts = {}) {
  let failed = false;

  if (python) {
    try {
      await assertPython({pythonPath});
    } catch (e) {
      failed = true;
      log.error(e instanceof DocutilsError ? e.message : e);
    }
  }

  if (typescript || typedoc) {
    try {
      await assertNpmVersion();
    } catch (e) {
      failed = true;
      log.error(e);
    }
  }

  if (typescript) {
    try {
      await assertTypeScript({tsconfigJsonPath, packageJsonPath});
    } catch (e) {
      failed = true;
      log.error(e instanceof DocutilsError ? e.message : e);
    }
  }

  if (typedoc) {
    try {
      await assertTypeDoc({typeDocJsonPath, packageJsonPath});
    } catch (e) {
      failed = true;
      log.error(e instanceof DocutilsError ? e.message : e);
    }
  }

  if (failed) {
    throw new DocutilsError('Validation failed');
  }

  log.success('Everything looks good!');
}

export interface ValidateOpts {
  pythonPath?: string;
  python?: boolean;
  typedoc?: boolean;
  typescript?: boolean;
  tsconfigJson?: string;
  typedocJson?: string;
  packageJson?: string;
}
