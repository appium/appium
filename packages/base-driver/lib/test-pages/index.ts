import path from 'node:path';
import express from 'express';
import type {Express} from 'express';
import favicon from 'serve-favicon';
import {guineaPig, guineaPigScrollable, guineaPigAppBanner, welcome} from './handlers';
import {produceError, produceCrash} from './crash';
import {TEST_FIXTURES_DIR} from './static-dir';

export interface RegisterTestPagesOpts {
  basePath: string;
}

/**
 * Mount deprecated built-in test pages and crash routes on an Express app.
 *
 * @deprecated Built-in test pages on the Appium server are deprecated and will be removed in
 * Appium 4. Driver CI should hard-copy needed fixtures and run a local test HTTP server.
 * @internal
 */
export function registerTestPages(app: Express, {basePath}: RegisterTestPagesOpts): void {
  app.use(favicon(path.resolve(TEST_FIXTURES_DIR, 'favicon.ico')));
  app.use(express.static(TEST_FIXTURES_DIR));

  app.use(`${basePath}/produce_error`, produceError);
  app.use(`${basePath}/crash`, produceCrash);

  app.all('/welcome', welcome);
  app.all('/test/guinea-pig', guineaPig);
  app.all('/test/guinea-pig-scrollable', guineaPigScrollable);
  app.all('/test/guinea-pig-app-banner', guineaPigAppBanner);
}

export {TEST_FIXTURES_DIR} from './static-dir';
export {isLegacyTestPagesEnabled} from './env';
