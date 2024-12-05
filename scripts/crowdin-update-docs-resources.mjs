import path from 'node:path';
import crypto from 'node:crypto';
import {
  log,
  walk,
  DEFAULT_LANGUAGE,
  performApiRequest,
  RESOURCES_ROOT,
  DOCUMENTS_EXT,
  ORIGINAL_MKDOCS_CONFIG,
  CROWIN_MKDOCS_CONFIG,
  MKDOCS_CONTENT_TYPE,
} from './crowdin-common.mjs';
import {fs} from '@appium/support';

const LANGUAGE_ROOT = path.resolve(RESOURCES_ROOT, DEFAULT_LANGUAGE);
// Max supported value is 500
const MAX_ITEMS_PER_PAGE = 300;
const DOCUMENT_CONTENT_TYPE = 'text/markdown';

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
  const fileName = path.basename(fullPath);
  const isMkDocsConfig = fileName === ORIGINAL_MKDOCS_CONFIG(DEFAULT_LANGUAGE);
  let result = `/${path.relative(LANGUAGE_ROOT, fullPath)}`;
  if (isMkDocsConfig || result.includes('..')) {
    return `/${isMkDocsConfig ? CROWIN_MKDOCS_CONFIG : fileName}`;
  }
  return result;
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
 * @returns {Promise<Record<string, any>[]>}
 */
async function listFiles() {
  const {data: filesData} = await performApiRequest('/files', {
    method: 'GET',
    params: {
      limit: MAX_ITEMS_PER_PAGE,
    }
  });
  return filesData.map(({data}) => data);
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
 * @param {string} name Should be properly url-encoded
 * @param {string} fullPath
 * @param {string} contentType Should be one of https://www.iana.org/assignments/media-types/media-types.xhtml
 * @returns {Promise<Record<string, any>>}
 */
async function addStorage(name, fullPath, contentType) {
  const {data: storageData} = await performApiRequest('/storages', {
    method: 'POST',
    headers: {
      'Crowdin-API-FileName': name,
      'Content-Type': contentType,
    },
    payload: fs.createReadStream(fullPath),
    isProjectSpecific: false,
  });
  return storageData;
}

/**
 *
 * @param {string[]} matchedFiles
 * @returns {Promise<Record<string, string>>}
 */
async function uploadDocumentsToStorage(matchedFiles) {
  const resultMap = {};
  let count = 0;
  for (const matchedFilePath of matchedFiles) {
    const crowdinPath = toCrowdinPath(matchedFilePath);
    // Hashing is used to make sure we aways create the same storage for the same file path in Crowdin
    const storageName = toHash(crowdinPath);
    log.info(`Uploading '${crowdinPath}' to Crowdin storage (${++count} of ${matchedFiles.length})`);
    const storageData = await addStorage(storageName, matchedFilePath, DOCUMENT_CONTENT_TYPE);
    resultMap[matchedFilePath] = storageData.id;
  }
  return resultMap;
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
 * @param {Record<string, number>[]} existingFilesData
 * @returns {Promise<Record<string, number>>}
 */
async function ensureFileStructure(storageMapping, directoriesMapping, existingFilesData) {
  const result = {};
  let count = 0;
  for (const [fullPath, storageId] of Object.entries(storageMapping)) {
    const pathInCrowdin = toCrowdinPath(fullPath);
    log.info(`Synchronizing '${pathInCrowdin}' (${++count} of ${Object.keys(storageMapping).length})`);
    const fileData = existingFilesData.find((data) => data.path === pathInCrowdin);
    if (fileData) {
      result[fullPath] = fileData.id;
    } else {
      const parentFolderId = directoriesMapping[path.dirname(pathInCrowdin)];
      try {
        const fileId = await addFile(encodeURIComponent(path.basename(pathInCrowdin)), storageId, parentFolderId);
        result[fullPath] = fileId;
      } catch (e) {
        log.warn(`Cannot add '${pathInCrowdin}'. Skipping it`);
        if (e.response) {
          log.info(`Crowdin API status: ${e.response.status}`);
          log.info(`Crowdin API error: ${JSON.stringify(e.response.data, null, 2)}`);
        } else {
          log.info(e);
        }
        continue;
      }
    }
  }
  return result;
}

/**
 * @returns {Promise<void>}
 */
async function cleanupObsoleteDocuments() {
  const [existingFilesData, matchedFiles] = await Promise.all([
    listFiles(),
    walk(LANGUAGE_ROOT, DOCUMENTS_EXT)
  ]);
  const matchedFilePaths = new Set(matchedFiles.map(toCrowdinPath));
  let count = 0;
  for (const existingFileData of existingFilesData) {
    if (matchedFilePaths.has(existingFileData.path)
      || !existingFileData.name.endsWith(DOCUMENTS_EXT)) {
      continue;
    }
    log.info(`Deleting the obsolete document '${existingFileData.path}'`);
    await deleteFile(existingFileData.id);
    ++count;
  }
  if (count > 0) {
    log.info(`Deleted ${count} obsolete documents`);
  }
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

/**
 *
 * @returns {Promise<void>}
 */
async function updateDocuments() {
  const matchedFiles = await walk(LANGUAGE_ROOT, DOCUMENTS_EXT);
  if (matchedFiles.length === 0) {
    throw new Error(`Did not find any files matching the '*${DOCUMENTS_EXT}' extension in '${LANGUAGE_ROOT}'`);
  }
  log.info(`Matched ${matchedFiles.length} files from '${LANGUAGE_ROOT}' for upload...`);

  const [storageMapping, directoriesMapping] = await Promise.all([
    uploadDocumentsToStorage(matchedFiles),
    ensureDirectoryStructure(matchedFiles),
  ]);
  const existingFilesData = await listFiles();
  const filesMapping = await ensureFileStructure(storageMapping, directoriesMapping, existingFilesData);
  await updateFiles(filesMapping, storageMapping);
}

/**
 * @returns {Promise<void>}
 */
async function updateMkDocsConfig() {
  const configFileName = ORIGINAL_MKDOCS_CONFIG(DEFAULT_LANGUAGE);
  const matchedFilePath = path.join(RESOURCES_ROOT, configFileName);
  if (!await fs.exists(matchedFilePath)) {
    throw new Error(`Did not find the MkDocs config at '${matchedFilePath}'`);
  }
  const storageData = await addStorage(encodeURIComponent(CROWIN_MKDOCS_CONFIG), matchedFilePath, MKDOCS_CONTENT_TYPE);
  const storageMapping = {[matchedFilePath]: storageData.id};
  const existingFilesData = await listFiles();
  const filesMapping = await ensureFileStructure(storageMapping, {}, existingFilesData);
  await updateFiles(filesMapping, storageMapping);
}

async function main() {
  log.info('Updating documents');
  await updateDocuments();
  await cleanupObsoleteDocuments();
  log.info('Updating MkDocs config');
  await updateMkDocsConfig();

  log.info('All done');
}

(async () => await main())();
