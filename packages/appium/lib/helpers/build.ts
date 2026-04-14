import _ from 'lodash';
import axios from 'axios';
import {exec} from 'teen_process';
import {system, fs} from '@appium/support';
import type {BuildInfo} from 'appium/types';
import {npmPackage} from '../utils';

export const APPIUM_VER = npmPackage.version;
export const rootDir = fs.findRoot(__dirname);

const GIT_BINARY = `git${system.isWindows() ? '.exe' : ''}`;
const GITHUB_API = 'https://api.github.com/repos/appium/appium';

const getFullGitPath = _.memoize(async function getFullGitPath(): Promise<string | null> {
  try {
    return await fs.which(GIT_BINARY);
  } catch {
    return null;
  }
});

/**
 * Returns the current git commit SHA for this Appium checkout.
 *
 * Attempts to read from local git first; when unavailable and fallback is enabled,
 * queries the GitHub API for the tag matching the current Appium version.
 */
export async function getGitRev(useGithubApiFallback = false): Promise<string | null> {
  const fullGitPath = await getFullGitPath();
  if (fullGitPath) {
    try {
      const {stdout} = await exec(fullGitPath, ['rev-parse', 'HEAD'], {
        cwd: __dirname,
      });
      return stdout.trim();
    } catch {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  // If the package folder is not a valid git repository
  // then fetch the corresponding tag info from GitHub
  try {
    return (
      await axios.get(`${GITHUB_API}/git/refs/tags/appium@${APPIUM_VER}`, {
        headers: {
          'User-Agent': `Appium ${APPIUM_VER}`,
        },
      })
    ).data?.object?.sha;
  } catch {}
  return null;
}

async function getGitTimestamp(commitSha: string, useGithubApiFallback = false): Promise<string | null> {
  const fullGitPath = await getFullGitPath();
  if (fullGitPath) {
    try {
      const {stdout} = await exec(fullGitPath, ['show', '-s', '--format=%ci', commitSha], {
        cwd: __dirname,
      });
      return stdout.trim();
    } catch {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  try {
    return (
      await axios.get(`${GITHUB_API}/git/tags/${commitSha}`, {
        headers: {
          'User-Agent': `Appium ${APPIUM_VER}`,
        },
      })
    ).data?.tagger?.date;
  } catch {}
  return null;
}

const BUILD_INFO: BuildInfo = {
  version: APPIUM_VER,
};

/**
 * Update mutable build info metadata from local git or GitHub fallback.
 */
export async function updateBuildInfo(useGithubApiFallback = false): Promise<void> {
  const sha = await getGitRev(useGithubApiFallback);
  if (!sha) {
    return;
  }
  BUILD_INFO['git-sha'] = sha;
  const buildTimestamp = await getGitTimestamp(sha, useGithubApiFallback);
  if (buildTimestamp) {
    BUILD_INFO.built = buildTimestamp;
  }
}

/**
 * Mutable object containing Appium build information. By default it
 * only contains the Appium version, but is updated with the build timestamp
 * and git commit hash asynchronously as soon as `updateBuildInfo` is called
 * and succeeds.
 */
export function getBuildInfo(): BuildInfo {
  return BUILD_INFO;
}
