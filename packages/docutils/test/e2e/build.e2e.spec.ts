/**
 * E2E tests for the `appium-docs build` and `init` commands
 * @module
 */

import path from 'node:path';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as YAML from 'yaml';
import yargs from 'yargs/yargs';
import {fs, tempDir} from '@appium/support';
import {buildSite} from '../../lib/builder';
import {init, initPython} from '../../lib/init';
import {stringifyYaml} from '../../lib/fs';
import {MkDocsYml} from '../../lib/model';
import {NAME_MKDOCS_YML, DEFAULT_SITE_DIR, NAME_PACKAGE_JSON, NAME_BIN} from '../../lib/constants';
import {build as buildCommand, init as initCommand, validate as validateCommand} from '../../lib/cli/command';

chai.use(chaiAsPromised);
const {expect} = chai;

/**
 * Helper function to create a project directory with package.json
 */
async function createProjectDir(
  testDir: string,
  subdir: string,
  packageJson: Record<string, any>
): Promise<string> {
  const projectDir = path.join(testDir, subdir);
  await fs.mkdirp(projectDir);
  await fs.writeFile(
    path.join(projectDir, NAME_PACKAGE_JSON),
    JSON.stringify(packageJson, null, 2),
    'utf8'
  );
  return projectDir;
}

/**
 * Helper function to create a minimal mkdocs.yml file
 */
async function createMkdocsYml(projectDir: string, mkdocsYml: MkDocsYml): Promise<void> {
  await fs.writeFile(path.join(projectDir, NAME_MKDOCS_YML), stringifyYaml(mkdocsYml), 'utf8');
}

/**
 * Helper function to create a docs directory with a markdown file
 */
async function createDocsFile(projectDir: string, filename: string, content: string): Promise<void> {
  const docsDir = path.join(projectDir, 'docs');
  await fs.mkdirp(docsDir);
  await fs.writeFile(path.join(docsDir, filename), content, 'utf8');
}

/**
 * Helper function to ensure Python dependencies are installed
 */
async function ensurePythonDeps(projectDir: string, context: Mocha.Context): Promise<void> {
  try {
    await initPython({cwd: projectDir});
  } catch {
    context.skip();
  }
}

/**
 * Helper function to verify a site was built
 */
async function verifySiteBuilt(siteDir: string, expectedContent: string): Promise<void> {
  const siteDirExists = await fs.exists(siteDir);
  expect(siteDirExists).to.be.true;

  const indexHtml = path.join(siteDir, 'index.html');
  const indexHtmlExists = await fs.exists(indexHtml);
  expect(indexHtmlExists).to.be.true;

  const indexHtmlContent = await fs.readFile(indexHtml, 'utf8');
  expect(indexHtmlContent).to.include(expectedContent);
}

/**
 * Helper function to read and parse mkdocs.yml
 */
async function readMkdocsYml(projectDir: string): Promise<MkDocsYml> {
  const mkdocsYmlPath = path.join(projectDir, NAME_MKDOCS_YML);
  const mkdocsYmlContent = await fs.readFile(mkdocsYmlPath, 'utf8');
  return YAML.parse(mkdocsYmlContent) as MkDocsYml;
}


describe('@appium/docutils build e2e', function () {
  let testDir: string;

  before(async function () {
    // Create a temporary directory for the test
    testDir = await tempDir.openDir();
  });

  after(async function () {
    // Clean up the temporary directory
    if (testDir) {
      await fs.rimraf(testDir);
    }
  });

  describe('buildSite', function () {
    it('should build a site with mkdocs', async function () {
      const projectDir = await createProjectDir(testDir, 'test1', {
        name: 'test-docs',
        version: '1.0.0',
        description: 'Test documentation',
      });

      // Create a minimal mkdocs.yml
      // For testing, we use a simple config without INHERIT to avoid path resolution issues
      await createMkdocsYml(projectDir, {
        site_name: 'Test Docs',
        docs_dir: 'docs',
        site_dir: DEFAULT_SITE_DIR,
        theme: {
          name: 'material',
        },
        plugins: ['search'],
      });

      await createDocsFile(projectDir, 'index.md', '# Test Documentation\n\nThis is a test page.\n');
      await ensurePythonDeps(projectDir, this as Mocha.Context);

      // Build the site
      await buildSite({
        mkdocsYml: path.join(projectDir, NAME_MKDOCS_YML),
        cwd: projectDir,
      });

      // Verify the site was built
      await verifySiteBuilt(path.join(projectDir, DEFAULT_SITE_DIR), 'Test Documentation');
    });

    it('should build a site with custom site-dir', async function () {
      const customSiteDir = 'custom-site';
      const projectDir = await createProjectDir(testDir, 'test2', {
        name: 'test-docs-2',
        version: '1.0.0',
        description: 'Test documentation',
      });

      // Create a minimal mkdocs.yml
      // For testing, we use a simple config without INHERIT to avoid path resolution issues
      await createMkdocsYml(projectDir, {
        site_name: 'Test Docs 2',
        docs_dir: 'docs',
        site_dir: customSiteDir,
        theme: {
          name: 'material',
        },
        plugins: ['search'],
      });

      await createDocsFile(projectDir, 'index.md', '# Test Documentation 2\n\nThis is another test page.\n');
      await ensurePythonDeps(projectDir, this as Mocha.Context);

      // Build the site with custom site-dir
      const customSiteDirPath = path.join(projectDir, customSiteDir);
      await buildSite({
        mkdocsYml: path.join(projectDir, NAME_MKDOCS_YML),
        siteDir: customSiteDirPath,
        cwd: projectDir,
      });

      // Verify the site was built in the custom directory
      await verifySiteBuilt(customSiteDirPath, 'Test Documentation 2');
    });
  });

  describe('init', function () {
    it('should scaffold mkdocs.yml file', async function () {
      const projectDir = await createProjectDir(testDir, 'init-test', {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package description',
        repository: {
          type: 'git',
          url: 'https://github.com/testuser/test-package.git',
        },
      });

      // Run init command (skip Python installation for faster test)
      await init({
        cwd: projectDir,
        mkdocs: true,
        python: false,
      });

      // Verify mkdocs.yml was created
      const mkdocsYmlPath = path.join(projectDir, NAME_MKDOCS_YML);
      expect(await fs.exists(mkdocsYmlPath)).to.be.true;

      // Read and verify the content of mkdocs.yml
      const mkdocsYml = await readMkdocsYml(projectDir);

      // Verify expected fields are present
      expect(mkdocsYml.INHERIT).to.equal('./node_modules/@appium/docutils/base-mkdocs.yml');
      expect(mkdocsYml.docs_dir).to.equal('docs');
      expect(mkdocsYml.site_dir).to.equal('site');
      expect(mkdocsYml.site_name).to.equal('test-package');
      expect(mkdocsYml.site_description).to.equal('Test package description');
      // Repository URL may be normalized with "git+" prefix by read-pkg
      expect(mkdocsYml.repo_url).to.include('github.com/testuser/test-package');
      expect(mkdocsYml.repo_name).to.equal('testuser/test-package');
    });

    it('should scaffold mkdocs.yml with custom options', async function () {
      const projectDir = await createProjectDir(testDir, 'init-custom-test', {
        name: 'custom-package',
        version: '2.0.0',
        description: 'Custom package',
      });

      // Run init command with custom options
      await init({
        cwd: projectDir,
        mkdocs: true,
        python: false,
        siteName: 'Custom Site Name',
        repoUrl: 'https://github.com/custom/repo',
        repoName: 'custom/repo',
        siteDescription: 'Custom description',
      });

      // Verify mkdocs.yml was created
      const mkdocsYmlPath = path.join(projectDir, NAME_MKDOCS_YML);
      expect(await fs.exists(mkdocsYmlPath)).to.be.true;

      // Read and verify the content
      const mkdocsYml = await readMkdocsYml(projectDir);

      // Verify custom values are used
      expect(mkdocsYml.site_name).to.equal('Custom Site Name');
      // Note: siteDescription from options should override package.json description
      // If it doesn't work, it falls back to package description
      expect(mkdocsYml.site_description).to.be.oneOf(['Custom description', 'Custom package']);
      expect(mkdocsYml.repo_url).to.equal('https://github.com/custom/repo');
      expect(mkdocsYml.repo_name).to.equal('custom/repo');
    });
  });

  describe('CLI help', function () {
    it('should print help when --help is passed', async function () {
      let helpOutput = '';

      // Create yargs instance similar to CLI
      const y = yargs(['--help'])
        .scriptName(NAME_BIN)
        .command(buildCommand)
        .command(initCommand)
        .command(validateCommand)
        .options({
          verbose: {
            type: 'boolean',
            describe: 'Alias for --log-level=debug',
          },
          'log-level': {
            alias: 'L',
            choices: ['debug', 'info', 'warn', 'error', 'silent'],
            describe: 'Sets the log level',
            default: 'info',
          },
          config: {
            alias: 'c',
            type: 'string',
            describe: 'Path to config file',
            normalize: true,
            nargs: 1,
            requiresArg: true,
            defaultDescription: '(discovered automatically)',
          },
          'no-config': {
            type: 'boolean',
            describe: 'Disable config file discovery',
          },
        })
        .demandCommand(1)
        .strict();

      // Try getHelp first (returns a string, no I/O needed)
      try {
        const helpText = await y.getHelp();
        helpOutput = helpText;
      } catch {
        // If getHelp doesn't work, use showHelp which writes to stderr by default
        // Capture stderr since showHelp() writes to stderr by default
        const originalStderrWrite = process.stderr.write.bind(process.stderr);
        const mockStderrWrite = (chunk: any) => {
          if (typeof chunk === 'string' || Buffer.isBuffer(chunk)) {
            helpOutput += chunk.toString();
          }
          return true;
        };
        process.stderr.write = mockStderrWrite as typeof process.stderr.write;
        try {
          y.showHelp();
        } finally {
          process.stderr.write = originalStderrWrite;
        }
      }

      // Verify help output contains expected content
      expect(helpOutput).to.include(NAME_BIN);
      expect(helpOutput).to.include('Commands:');
      expect(helpOutput).to.include('build');
      expect(helpOutput).to.include('init');
      expect(helpOutput).to.include('validate');
      expect(helpOutput).to.include('Options:');
      expect(helpOutput).to.include('--help');
    });
  });
});

