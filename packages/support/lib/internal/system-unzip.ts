import {exec} from 'teen_process';

import {isWindows} from './platform.js';

export interface SystemUnzipDeps {
  /** Resolves the full path to the executable, rejects if it is not found */
  which: (binaryName: string) => Promise<string>;
  log: {debug: (...args: any[]) => void};
}

const executablePaths = new Map<string, Promise<string>>();

/**
 * Executes system unzip (e.g., `/usr/bin/unzip`). If available, it is
 * significantly faster than the JS implementation.
 * By default all files in the destDir get overridden if already exist.
 *
 * @param zipFilePath The full path to the source ZIP file
 * @param destDir The full path to the destination folder.
 * This folder is expected to already exist before extracting the archive.
 */
export async function extractWithSystemUnzip(
  zipFilePath: string,
  destDir: string,
  deps: SystemUnzipDeps,
): Promise<void> {
  const isWindowsHost = isWindows();
  let executablePath: string;
  try {
    executablePath = await getExecutablePath(isWindowsHost ? 'powershell.exe' : 'unzip', deps);
  } catch (e) {
    throw new Error('Could not find system unzip', {cause: e});
  }

  if (isWindowsHost) {
    // on Windows we use PowerShell to unzip files
    await exec(executablePath, [
      '-command',
      'Expand-Archive',
      '-LiteralPath',
      zipFilePath,
      '-DestinationPath',
      destDir,
      '-Force',
    ]);
  } else {
    // -q means quiet (no stdout)
    // -o means overwrite
    // -d is the dest dir
    await exec(executablePath, ['-q', '-o', zipFilePath, '-d', destDir]);
  }
}

/** Finds and memoizes the full path to the given executable. Rejects if it is not found. */
function getExecutablePath(binaryName: string, {which, log}: SystemUnzipDeps): Promise<string> {
  let result = executablePaths.get(binaryName);
  if (!result) {
    result = (async () => {
      const fullPath = await which(binaryName);
      log.debug(`Found '${binaryName}' at '${fullPath}'`);
      return fullPath;
    })();
    executablePaths.set(binaryName, result);
  }
  return result;
}
