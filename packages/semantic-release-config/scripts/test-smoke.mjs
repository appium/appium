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

const betaConfig = releaseConfig({betaBranch: 'next-major'});
const expectedBetaBranches = ['master', {name: 'next-major', channel: 'beta', prerelease: 'beta'}];
if (JSON.stringify(betaConfig.branches) !== JSON.stringify(expectedBetaBranches)) {
  throw new Error('expected betaBranch to default branches to [\'master\', <beta branch entry>]');
}

const betaWithBranchesConfig = releaseConfig({branches: ['main'], betaBranch: 'next-major', betaChannel: 'next'});
const expectedComposedBranches = ['main', {name: 'next-major', channel: 'next', prerelease: 'next'}];
if (JSON.stringify(betaWithBranchesConfig.branches) !== JSON.stringify(expectedComposedBranches)) {
  throw new Error('expected betaBranch to compose with an explicit branches option and custom betaChannel');
}
