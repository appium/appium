/**
 * Validates `docs/en/llms.txt` against the documentation sources.
 *
 * `llms.txt` is hand-written, so nothing regenerates it when a page is added, renamed or removed.
 * This check fails the build when it points at a page that no longer exists, and when a page has
 * been added without being listed.
 *
 * For simplicity this file is not transpiled and is run directly via an npm script.
 * @module
 */

// @ts-check

/* eslint-disable no-console */

const fs = require('node:fs/promises');
const path = require('node:path');

const DOCS_EN_DIR = path.resolve(__dirname, '..', 'en');
const LLMS_TXT_PATH = path.join(DOCS_EN_DIR, 'llms.txt');

/**
 * Base URL that every link to our own documentation must use. `llms.txt` is served from a versioned
 * directory but is consumed out of context, so the links inside it have to be absolute, and they
 * have to point at the `latest` alias rather than at a pinned version.
 */
const SITE_BASE_URL = 'https://appium.io/docs/en/latest';

/**
 * Pages that are deliberately absent from `llms.txt`, and should not be warned about.
 */
const UNLISTED_PAGES = [
  // individual blog posts; the blog index is listed instead
  /^blog\/posts\//,
];

/**
 * Extracts the target of every Markdown link in `contents`.
 * @param {string} contents
 * @returns {string[]}
 */
function extractLinks(contents) {
  return [...contents.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)].map(([, url]) => url);
}

/**
 * Maps a documentation URL back to the source files that could have produced it.
 *
 * MkDocs builds directory URLs by default, so `guides/caps.md` is served at `guides/caps/`, and
 * `intro/index.md` is served at `intro/`. Both spellings are accepted here.
 *
 * @param {string} url an URL underneath {@linkcode SITE_BASE_URL}
 * @returns {string[]} candidate paths, relative to the `en` docs dir
 */
function candidateSourcePaths(url) {
  const withoutBase = url.slice(SITE_BASE_URL.length);
  const pagePath = withoutBase.replace(/#.*$/, '').replace(/^\//, '').replace(/\/$/, '');
  if (!pagePath) {
    return ['index.md'];
  }
  return [`${pagePath}.md`, path.posix.join(pagePath, 'index.md')];
}

/**
 * Finds every Markdown page in the English docs, as paths relative to the `en` docs dir.
 * @returns {Promise<string[]>}
 */
async function findAllPages() {
  const entries = await fs.readdir(DOCS_EN_DIR, {recursive: true});
  return entries
    .map((entry) => entry.split(path.sep).join(path.posix.sep))
    .filter((entry) => entry.endsWith('.md'))
    .sort();
}

/**
 * Checks that every documentation link in `llms.txt` resolves to a source file.
 * @param {string[]} links
 * @returns {Promise<string[]>} error messages
 */
async function findBrokenLinks(links) {
  const errors = [];
  for (const link of links) {
    const isOurDocs = link.includes('appium.io/docs/') || link.startsWith('/docs/');
    // relative and site-relative links do not survive being read out of context, and a link to our
    // docs that is not under the `latest` alias goes stale as soon as a new version is released
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(link);
    if ((!isAbsolute || isOurDocs) && !link.startsWith(SITE_BASE_URL)) {
      errors.push(`${link}\n    must be an absolute link under ${SITE_BASE_URL}`);
      continue;
    }
    if (!link.startsWith(SITE_BASE_URL)) {
      // external link; not ours to validate
      continue;
    }
    const candidates = candidateSourcePaths(link);
    const found = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          await fs.access(path.join(DOCS_EN_DIR, candidate));
          return true;
        } catch {
          return false;
        }
      })
    );
    if (!found.includes(true)) {
      errors.push(`${link}\n    no such page (looked for ${candidates.join(' and ')})`);
    }
  }
  return errors;
}

/**
 * Finds pages that exist but are not linked from `llms.txt`.
 * @param {string[]} links
 * @param {string[]} pages
 * @returns {string[]}
 */
function findUnlistedPages(links, pages) {
  const linked = new Set(
    links
      .filter((link) => link.startsWith(SITE_BASE_URL))
      .flatMap((link) => candidateSourcePaths(link))
  );
  return pages.filter(
    (page) => !linked.has(page) && !UNLISTED_PAGES.some((pattern) => pattern.test(page))
  );
}

/**
 * Validates `llms.txt`. Both broken links and unlisted pages fail the build.
 */
async function main() {
  const contents = await fs.readFile(LLMS_TXT_PATH, 'utf-8');
  const links = extractLinks(contents);
  const pages = await findAllPages();

  const brokenLinks = await findBrokenLinks(links);
  const unlistedPages = findUnlistedPages(links, pages);

  if (unlistedPages.length) {
    console.error(
      `\nERROR: ${unlistedPages.length} page(s) are not listed in llms.txt. Add them, or add ` +
        `them to UNLISTED_PAGES in this script if they are intentionally omitted:`
    );
    for (const page of unlistedPages) {
      console.error(`  - ${page}`);
    }
  }

  if (brokenLinks.length) {
    console.error(`\nERROR: ${brokenLinks.length} link(s) in llms.txt do not resolve:`);
    for (const error of brokenLinks) {
      console.error(`  - ${error}`);
    }
  }

  if (brokenLinks.length || unlistedPages.length) {
    throw new Error(
      `llms.txt has ${brokenLinks.length} broken link(s) and is missing ` +
        `${unlistedPages.length} page(s)`
    );
  }

  console.log(`\nllms.txt is valid: ${links.length} link(s) checked, ${pages.length} page(s) found`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

module.exports = main;
