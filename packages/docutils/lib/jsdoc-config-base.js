import path from 'path';

const docdashEntry = require.resolve('docdash');
const docdashPath = path.dirname(docdashEntry);

const baseConfig = {
  plugins: ['plugins/markdown', 'jsdoc-plugin-typescript'],
  opts: {
    destination: './jsdoc-out',
    tutorials: './docs',
    source: {
      include: ['./lib'],
      exclude: [],
      includePattern: '.+\\.js(doc|x)?$',
      excludePattern: '(^|\\/|\\\\)_',
    },
    template: docdashPath,
    encoding: 'utf8',
  },
  typescript: {
    moduleRoot: 'lib',
  },
  docdash: {
    sectionOrder: [
      'Tutorials',
      'Classes',
      'Modules',
      'Externals',
      'Events',
      'Namespaces',
      'Mixins',
      'Interfaces',
    ],
    navLevel: 5,
    search: true,
    collapse: false,
  },
};

export default baseConfig;
