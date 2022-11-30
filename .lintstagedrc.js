module.exports = {
  '*.js': ['eslint --fix', 'prettier --write'],
  '*.ts*': ['prettier --write'],
  'appium-config-schema.js': () => [
    'npm run --workspace=./packages/schema build',
    'git add -A packages/schema/lib/appium-config.schema.json',
    'npm run --workspace=./packages/types build',
    'git add -A packages/types/lib/appium-config.ts',
  ],
  '!(package|package-lock)*.json': ['prettier --write'],
};
