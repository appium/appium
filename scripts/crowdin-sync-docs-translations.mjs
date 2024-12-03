import path from 'node:path';
import {fs, net, tempDir, zip} from '@appium/support';
import {waitForCondition} from 'asyncbox';
import {
  log,
  walk,
  ORIGINAL_LANGUAGE,
  performApiRequest,
  RESOURCES_ROOT,
  DOCUMENTS_EXT,
  MKDOCS_YAML,
} from './crowdin-common.mjs';

const BUILD_TIMEOUT_MS = 1000 * 60 * 10;
const BUILD_STATUS = {
  finished: 'finished',
  created: 'created',
  inProgress: 'inProgress',
  canceled: 'canceled',
  failed: 'failed',
};
// Add new languages here whenever needed
const CROWDIN_TO_FS_LANGUAGES_MAP = {
  ja: 'ja',
  'zh-CN': 'zh',
  // de,es-ES,fr,it,ja,pt-BR,uk
};

/**
 *
 * @returns {Promise<number>}
 */
async function buildTranslations() {
  log.info('Building project translations');
  const {data: buildData} = await performApiRequest('/translations/builds', {
    method: 'POST',
  });
  return buildData.id;
}

/**
 *
 * @param {number} buildId
 * @param {string} dstPath
 * @returns {Promise<void>}
 */
async function downloadTranslations(buildId, dstPath) {
  log.info(`Waiting up to ${BUILD_TIMEOUT_MS / 1000}s for the build #${buildId} to finish`);
  await waitForCondition(
    async () => {
      const {data: buildData} = await performApiRequest(`/translations/builds/${buildId}`);
      switch (buildData.status) {
        case BUILD_STATUS.finished:
          return true;
        case BUILD_STATUS.inProgress:
        case BUILD_STATUS.created:
          return false;
        default:
          throw new Error(`The translations build got an unexpected status '${buildData.status}'`);
      }
    },
    {
      waitMs: BUILD_TIMEOUT_MS,
      intervalMs: 1000,
    },
  );
  const {data: downloadData} = await performApiRequest(`/translations/builds/${buildId}/download`);
  log.info(`Downloading translations to '${dstPath}'`);
  await net.downloadFile(downloadData.url, dstPath);
}

/**
 *
 * @param {string} srcDir
 * @param {string} dstDir
 * @returns {Promise<void>}
 */
async function syncTranslatedDocuments(srcDir, dstDir) {
  const srcTranslatedDocs = await walk(srcDir, DOCUMENTS_EXT);
  if (srcTranslatedDocs.length === 0) {
    return;
  }

  let count = 0;
  for (const srcPath of srcTranslatedDocs) {
    const relativeTranslatedDocPath = path.relative(srcDir, srcPath);
    const dstPath = path.join(dstDir, relativeTranslatedDocPath);
    log.info(`Synchronizing '${dstPath}' (${++count} of ${srcTranslatedDocs.length})`);
    await fs.mv(srcPath, dstPath, {mkdirp: true});
  }
}

/**
 *
 * @param {string} srcDir
 * @param {string} dstDir
 * @param {string} dstLanguage
 * @returns {Promise<void>}
 */
async function syncTranslatedConfig(srcDir, dstDir, dstLanguage) {
  const configPath = path.join(srcDir, MKDOCS_YAML(ORIGINAL_LANGUAGE));
  if (!await fs.exists(configPath)) {
    throw new Error(`Did not find the translated MkDocs config at '${configPath}'`);
  }

  const dstPath = path.join(dstDir, MKDOCS_YAML(dstLanguage));
  log.info(`Synchronizing '${dstPath}'`);
  await fs.mv(configPath, dstPath);
}

async function main() {
  const buildId = await buildTranslations();
  const zipPath = await tempDir.path({prefix: 'translations', suffix: '.zip'});
  try {
    await downloadTranslations(buildId, zipPath);
    const tmpRoot = await tempDir.openDir();
    try {
      await zip.extractAllTo(zipPath, tmpRoot);
      const srcLanguageNames = await fs.readdir(tmpRoot);
      log.info(`Available Crowdin languages: ${srcLanguageNames}`);
      log.info(`Supported languages map: ${JSON.stringify(CROWDIN_TO_FS_LANGUAGES_MAP)}`);
      let count = 0;
      for (const name of srcLanguageNames) {
        const currentPath = path.join(tmpRoot, name);
        if (!(await fs.stat(currentPath)).isDirectory() || name === ORIGINAL_LANGUAGE) {
          continue;
        }

        const dstLanguageName = CROWDIN_TO_FS_LANGUAGES_MAP[name];
        if (!dstLanguageName) {
          // If the target language is not present in the map we ignore it
          continue;
        }

        await syncTranslatedDocuments(currentPath, path.join(RESOURCES_ROOT, dstLanguageName));
        await syncTranslatedConfig(currentPath, RESOURCES_ROOT, dstLanguageName);
        log.info(
          `Successfully updated resources for the '${dstLanguageName}' ` +
          `('${name}' in Crowdin) language (${++count} of ${Object.keys(CROWDIN_TO_FS_LANGUAGES_MAP).length})`
        );
      }
    } finally {
      await fs.rimraf(tmpRoot);
    }
  } finally {
    await fs.rimraf(zipPath);
  }
}

(async () => await main())();
