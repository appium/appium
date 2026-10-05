import assert from 'node:assert/strict';
import path from 'node:path';
import {describe, it} from 'node:test';

import {fs, tempDir} from '@appium/support';

import {DriverConfig} from '../../../lib/extension/driver-config.js';
import {Manifest} from '../../../lib/extension/manifest/index.js';
import {resetSchema} from '../../../lib/schema/schema.js';

describe('extension import paths', function () {
  for (const type of ['commonjs', 'module']) {
    for (const reload of [false, true]) {
      it(`loads ${type} extensions and schemas from paths with URL characters, reload=${reload}`, async function () {
        const root = await tempDir.openDir();
        const previousReload = process.env.APPIUM_RELOAD_EXTENSIONS;
        try {
          if (reload) {
            process.env.APPIUM_RELOAD_EXTENSIONS = '1';
          } else {
            delete process.env.APPIUM_RELOAD_EXTENSIONS;
          }
          const home = path.join(root, 'home#100%');
          const packageRoot = path.join(home, 'node_modules', 'probe-driver');
          await fs.mkdir(packageRoot, {recursive: true});
          await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({type, main: 'index.js'}));
          const declaration = 'class Probe {}';
          await fs.writeFile(
            path.join(packageRoot, 'index.js'),
            type === 'module' ? `export ${declaration}` : `${declaration}\nmodule.exports = {Probe};`,
          );
          const schema = {type: 'object', properties: {enabled: {type: 'boolean'}}};
          await fs.writeFile(
            path.join(packageRoot, 'schema.js'),
            `${type === 'module' ? 'export default' : 'module.exports ='} ${JSON.stringify(schema)};`,
          );
          const manifest = Manifest.getInstance(home);
          const extension = {
            pkgName: 'probe-driver',
            mainClass: 'Probe',
            version: '1.0.0',
            automationName: 'Probe',
            platformNames: ['Fake'],
            installType: 'npm' as const,
            installSpec: 'probe-driver',
            installPath: packageRoot,
            schema: 'schema.js',
          };
          manifest.setExtension('driver', 'probe', extension);
          const config = DriverConfig.create(manifest);

          const first = await config.requireAsync('probe');
          const second = await config.requireAsync('probe');
          assert.equal(first.name, 'Probe');
          assert.equal(second.name, 'Probe');
          assert.equal(first === second, !reload);
          assert.deepEqual(await config.readExtensionSchema('probe', extension), schema);
        } finally {
          if (previousReload === undefined) {
            delete process.env.APPIUM_RELOAD_EXTENSIONS;
          } else {
            process.env.APPIUM_RELOAD_EXTENSIONS = previousReload;
          }
          resetSchema();
          await fs.rimraf(root);
        }
      });
    }
  }
});
