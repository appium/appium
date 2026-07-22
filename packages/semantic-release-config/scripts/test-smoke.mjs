import releaseConfig from '../index.mjs';

if (typeof releaseConfig !== 'function') {
  throw new Error('expected default export to be a function');
}

const libraryConfig = releaseConfig();
if (!Array.isArray(libraryConfig.plugins) || libraryConfig.plugins.length !== 6) {
  throw new Error('expected library config to define 6 plugins');
}
if (libraryConfig.branches) {
  throw new Error('expected library config to omit branches by default');
}

const appConfig = releaseConfig({flavor: 'app', branches: ['main']});
const npmPlugin = appConfig.plugins.find((plugin) => plugin[0] === '@semantic-release/npm');
if (!npmPlugin || npmPlugin[1]?.npmPublish !== false) {
  throw new Error('expected app flavor to disable npm publish');
}
if (appConfig.branches?.[0] !== 'main') {
  throw new Error('expected branches option to be passed through');
}
