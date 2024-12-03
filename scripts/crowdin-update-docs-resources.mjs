import {createReadStream} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  log,
  walk,
  ORIGINAL_LANGUAGE,
  performApiRequest,
  RESOURCES_ROOT,
  RESOURCES_EXT,
} from './crowdin-common.mjs';

const LANGUAGE_ROOT = path.resolve(RESOURCES_ROOT, ORIGINAL_LANGUAGE);
const MAX_ITEMS_PER_PAGE = 300;
const CONTENT_TYPE = 'text/markdown';

/**
 *
 * @param {string} str
 * @returns {string}
 */
function toHash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 *
 * @param {string} fullPath
 * @returns {string}
 */
function toCrowdinPath(fullPath) {
  return `/${path.relative(LANGUAGE_ROOT, fullPath)}`;
}

/**
 *
 * @param {string[]} matchedFiles
 * @returns {Promise<Record<string, string>>}
 */
async function uploadDocsToStorage(matchedFiles) {
  const resultMap = {};
  let count = 0;
  for (const matchedFilePath of matchedFiles) {
    const crowdinPath = toCrowdinPath(matchedFilePath);
    // Hashing is used to make sure we aways create the same storage for the same file path in Crowdin
    const storageName = toHash(crowdinPath);
    log.info(`Uploading '${crowdinPath}' to Crowdin storage (${++count} of ${matchedFiles.length})`);
    const {data: storageData} = await performApiRequest('/storages', {
      method: 'POST',
      headers: {
        'Crowdin-API-FileName': storageName,
        'Content-Type': CONTENT_TYPE,
      },
      payload: createReadStream(matchedFilePath),
      isProjectSpecific: false,
    });
    resultMap[matchedFilePath] = storageData.id;
  }
  return resultMap;
}

/**
 *
 * @param {string} name
 * @param {string|null|undefined} [parentId]
 * @returns {Promise<number>}
 */
async function addDirectory(name, parentId) {
  const {data: directoryData} = await performApiRequest('/directories', {
    method: 'POST',
    payload: {
      name,
      directoryId: parentId,
    }
  });
  return directoryData.id;
}

/**
 *
 * @param {string} name
 * @param {number} storageId
 * @param {string|null|undefined} [parentDirectoryId]
 * @returns {Promise<number>}
 */
async function addFile(name, storageId, parentDirectoryId) {
  const {data: fileData} = await performApiRequest('/files', {
    method: 'POST',
    payload: {
      name,
      storageId,
      directoryId: parentDirectoryId,
    }
  });
  return fileData.id;
}

/**
 *
 * @param {number} fileId
 * @returns {Promise<void>}
 */
async function deleteFile(fileId) {
  await performApiRequest(`/files/${fileId}`, {
    method: 'DELETE',
  });
}

/**
 *
 * @param {number} [parentDirectoryId]
 * @param {number} [recursion]
 * @return {Promise<Record<string, any>[]>}
 */
async function listDirectories(parentDirectoryId) {
  const {data: directoriesData} = await performApiRequest('/directories', {
    method: 'GET',
    params: {
      limit: MAX_ITEMS_PER_PAGE,
      directoryId: parentDirectoryId,
      recursion: parentDirectoryId ? 10 : undefined,
    },
  });
  return directoriesData.map(({data}) => data);
}

/**
 *
 * @param {string[]} matchedFiles
 * @returns {Promise<Record<string, number>>}
 */
async function ensureDirectoryStructure(matchedFiles) {
  const uniqueFolderPaths = new Set();
  for (const matchedFile of matchedFiles) {
    const relativePath = path.relative(LANGUAGE_ROOT, path.dirname(matchedFile));
    if (relativePath) {
      uniqueFolderPaths.add(relativePath);
    }
  }
  if (uniqueFolderPaths.size === 0) {
    return {};
  }

  const splitPaths = Array.from(uniqueFolderPaths)
    .map((p) => p.split(path.sep))
    .sort((a, b) => a.length - b.length);
  const result = {};
  const topDirectories = await listDirectories();
  for (const splitPath of splitPaths) {
    for (const level in splitPath) {
      const pathInCrowdin = `/${splitPath.slice(0, level + 1).join('/')}`;
      const parentPathInCrowdin = path.dirname(pathInCrowdin);
      const parentDirectoryId = level === 0 ? undefined : result[parentPathInCrowdin];
      const subDirectories = level === 0 ? topDirectories : await listDirectories(parentDirectoryId);
      const existingDirectoryData = subDirectories.find((data) => data.path === pathInCrowdin);
      if (existingDirectoryData) {
        log.info(`Crowdin directory '${pathInCrowdin}' already exists`);
        result[pathInCrowdin] = existingDirectoryData.id;
      } else {
        log.info(`Crowdin directory '${pathInCrowdin}' does not exist yet. Adding it`);
        result[pathInCrowdin] = await addDirectory(splitPath[level], parentDirectoryId);
      }
    }
  }
  return result;
}

/**
 *
 * @param {Record<string, number>} storageMapping
 * @param {Record<string, number>} directoriesMapping
 * @returns {Promise<Record<string, number>>}
 */
async function ensureFileStructure(storageMapping, directoriesMapping) {
  const {data: filesData} = await performApiRequest('/files', {
    method: 'GET',
    params: {
      limit: MAX_ITEMS_PER_PAGE,
    }
  });
  const existingFilesData = filesData.map(({data}) => data);
  const processedFilesData = new Set();
  const result = {};
  let count = 0;
  for (const [fullPath, storageId] of Object.entries(storageMapping)) {
    const pathInCrowdin = toCrowdinPath(fullPath);
    log.info(`Synchronizing '${pathInCrowdin}' (${++count} of ${Object.keys(storageMapping).length})`);
    const fileData = existingFilesData.find((data) => data.path === pathInCrowdin);
    if (fileData) {
      result[fullPath] = fileData.id;
      processedFilesData.add(existingFilesData);
    } else {
      const parentFolderId = directoriesMapping[path.dirname(pathInCrowdin)];
      try {
        const fileId = await addFile(encodeURIComponent(path.basename(pathInCrowdin)), storageId, parentFolderId);
        result[fullPath] = fileId;
      } catch (e) {
        log.info(`Cannot add '${pathInCrowdin}'. Skipping it`);
        log.warn(e);
        continue;
      }
    }
  }

  const obsoleteFilesData = existingFilesData.filter((data) => !processedFilesData.has(data));
  count = 0;
  for (const obsoleteFileData of obsoleteFilesData) {
    log.info(`Deleting the obsolete file '${obsoleteFileData.path}' (${++count} of ${obsoleteFilesData.length})`);
    await deleteFile(obsoleteFileData.id);
  }
  return result;
}

/**
 *
 * @param {Record<string, number>} filesMapping
 * @param {Record<string, number>} storageMapping
 * @returns {Promise<void>}
 */
async function updateFiles(filesMapping, storageMapping) {
  let count = 0;
  for (const [fullPath, fileId] of Object.entries(filesMapping)) {
    log.info(`Updating '${toCrowdinPath(fullPath)}' (${++count} of ${Object.keys(filesMapping).length})`);
    await performApiRequest(`/files/${fileId}`, {
      method: 'PUT',
      payload: {
        storageId: storageMapping[fullPath],
      },
    });
  }
}

async function main() {
  const matchedFiles = await walk(LANGUAGE_ROOT, RESOURCES_EXT);
  if (matchedFiles.length === 0) {
    throw new Error(`Did not find any files matching the '*${RESOURCES_EXT}' extension in '${LANGUAGE_ROOT}'`);
  }
  log.info(`Matched ${matchedFiles.length} files from '${LANGUAGE_ROOT}' for upload...`);

  const [storageMapping, directoriesMapping] = await Promise.all([
    uploadDocsToStorage(matchedFiles),
    ensureDirectoryStructure(matchedFiles),
  ]);
  const filesMapping = await ensureFileStructure(storageMapping, directoriesMapping);
  await updateFiles(filesMapping, storageMapping);

  log.info('All done');
}

(async () => await main())();
