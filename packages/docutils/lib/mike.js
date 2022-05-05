import {exec} from 'teen_process';
import log from './logger';

const DEFAULT_REMOTE = 'origin';
const DEFAULT_BRANCH = 'gh-pages';
const MIKE_VER_STRING = 'mike 1.';

export class Mike {
  /** @type string */ remote;
  /** @type string */ branch;
  /** @type string? */ prefix;
  /** @type string */ configFile;
  /** @type boolean */ _mikeVerified = false;

  constructor(/** @type MikeOpts */ opts) {
    this.remote = opts.remote || DEFAULT_REMOTE;
    this.branch = opts.branch || DEFAULT_BRANCH;
    this.prefix = opts.prefix;
    this.configFile = opts.configFile;
  }

  /**
   * Throw an error if the 'mike' binary cannot be found
   *
   * @throws Error
   */
  async verifyMike() {
    if (this._mikeVerified) {
      return;
    }
    try {
      const {stdout} = await this.exec('--version', [], false);
      if (!stdout.includes(MIKE_VER_STRING)) {
        throw new Error('Mike was installed but was not version 1.x');
      }
    } catch (err) {
      throw new Error(`Could not verify appropriate mike binary exists: ${err}`);
    }
    this._mikeVerified = true;
  }

  /**
   * Get an array of args based on the class members that can be used with Mike-related subprocess
   * execution
   *
   * @param {string} cmdName - the name of the mike command to run
   * @param {string[]} cmdArgs - an array of command-specific arguments
   *
   * @returns string[]
   */
  getMikeArgs(cmdName, cmdArgs) {
    return [
      cmdName,
      ...cmdArgs,
      '--config-file',
      this.configFile,
      '--remote',
      this.remote,
      '--branch',
      this.branch,
      '--prefix',
      this.prefix,
    ];
  }

  /**
   * Exec mike as a subprocess
   *
   * @param {string} mikeCmd - the mike command to run
   * @param {string[]} [mikeArgs=[]] - the arguments to pass to the mike command
   * @param {boolean?} [verify=true] - whether to verify mike exists first
   *
   * @returns Promise<import('teen_process').ExecResult<string>>
   */
  async exec(mikeCmd, mikeArgs = [], verify = true) {
    if (verify) {
      await this.verifyMike();
    }
    const args = this.getMikeArgs(mikeCmd, mikeArgs);
    log.debug(`Running mike ${args.join(' ')}`);
    return await exec('mike', args);
  }

  /**
   * Return the list of mike deploys
   *
   * @returns string[]
   */
  async list() {
    const {stdout} = await this.exec('list');
    return stdout
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Set the default version or alias
   *
   * @param {string} alias - the version or alias
   */
  async setDefault(alias) {
    await this.exec('set-default', [alias]);
  }

  /**
   * Deploy docs to the branch
   *
   * @param {MikeDeployOpts} opts - the deploy options
   */
  async deploy(opts) {
    const args = [opts.version];
    if (opts.alias) {
      args.push(opts.alias, '--update-aliases');
    }
    if (opts.shouldPush) {
      args.push('--push');
    }
    if (opts.shouldRebase) {
      args.push('--rebase');
    }
    if (opts.commit) {
      args.push('--message', opts.commit);
    }
    await this.exec('deploy', args);
  }
}

/**
 * @typedef MikeOpts - options for instantiating a Mike object
 * @property {string} [remote="origin"] - the git remote to push docs to
 * @property {string} [branch="gh-pages"] - the git branch to push docs to
 * @property {string?} prefix - the path prefix on the branch if any
 * @property {string} configFile - the mkdocs config file to use
 */

/**
 * @typedef MikeDeployOpts - options for deploying docs with Mike
 * @param {string} version - the version to deploy
 * @param {string?} alias - the alias to alias (or re-alias) the version
 * @param {string?} commit - the commit message to use as an override
 * @param {boolean?} shouldPush - whether mike should push the commits to the remote
 * @param {boolean?} shouldRebase - whether mike should rebase
 */
