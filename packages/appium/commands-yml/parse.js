import path from 'path';
import yaml from 'yaml-js';
import { fs, util } from '@appium/support';
import validate from 'validate.js';
import Handlebars from 'handlebars';
import _ from 'lodash';
import { asyncify } from 'asyncbox';
import { validator, CLIENT_URL_TYPES } from './validator';
import url from 'url';
import log from 'fancy-log';

// What range of platforms do the driver's support
const platformRanges = {
  xcuitest: ['9.3'],
  uiautomation: ['8.0', '9.3'],
  espresso: ['?'],
  uiautomator2: ['?'],
  uiautomator: ['4.3'],
  windows: ['10'],
  mac: ['?'], // TODO
};

// When was the driver supported in Appium?
const appiumRanges = {
  xcuitest: ['1.6.0'],
  uiautomator2: ['1.6.0'],
  espresso: ['1.9.0'],
  windows: ['1.6.0'],
  mac: ['1.6.4'],
};

const rootFolder = fs.findRoot(__dirname);

// Create Handlebars helper that shows a version range
Handlebars.registerHelper('versions', function versionHelper (object, name, driverName) {
  if (!object) {
    return 'None';
  }

  if (!_.isObject(object)) {
    object = {};
  }

  let min = object[name ? `${name}_min` : 'min'];
  let max = object[name ? `${name}_max` : 'max'];

  if (!min) {
    if (name === 'appium' && _.isArray(appiumRanges[driverName])) {
      min = appiumRanges[driverName][0];
    } else if (name === 'platform' && _.isArray(platformRanges[driverName])) {
      min = platformRanges[driverName][0];
    }
  }

  if (!max) {
    if (name === 'appium' && appiumRanges[driverName]) {
      max = appiumRanges[driverName][1];
    } else if (name === 'platform' && platformRanges[driverName]) {
      max = platformRanges[driverName][1];
    }
  }

  if (!min && !max) {
    return 'All';
  } else if (!max) {
    return `${min}+`;
  } else if (!min) {
    return `<= ${max}`;
  }

  return `${min} to ${max}`;
});

Handlebars.registerHelper('hyphenate', (str) => str.replace('_', '-'));
Handlebars.registerHelper('uppercase', (str) => str.toUpperCase());

Handlebars.registerHelper('capitalize', function capitalizeDriver (driverName) {
  switch (driverName.toLowerCase()) {
    case 'xcuitest':
      return 'XCUITest';
    case 'uiautomation':
      return 'UIAutomation';
    case 'uiautomator2':
      return 'UiAutomator2';
    case 'uiautomator':
      return 'UiAutomator';
    case 'espresso':
      return 'Espresso';
    default:
      return driverName.length === 0 ? driverName : driverName[0].toUpperCase() + driverName.substr(1);
  }
});

Handlebars.registerHelper('if_eq', function ifEq (a, b, opts) {
  if (a === b) {
    return opts.fn(this);
  } else {
    return opts.inverse(this);
  }
});

function getBaseHostname (fullUrl) {
  const baseUrl = url.parse(fullUrl);
  return baseUrl.hostname;
}

Handlebars.registerHelper('base_url', function baseUrl (fullUrl) {
  return getBaseHostname(fullUrl);
});

Handlebars.registerHelper('client_url', function clientUrl (clientUrl) {
  if (!clientUrl) {
    return;
  }

  const createUrlString = function createUrlString (clientUrl, name = getBaseHostname(clientUrl)) {
    return `[${name}](${clientUrl})`;
  };

  if (!_.isArray(clientUrl)) {
    return createUrlString(clientUrl);
  }

  let urlStrings = [];
  for (const item of clientUrl) {
    for (let [key, value] of _.toPairs(item)) {
      key = key.toLowerCase();
      const urlStr = CLIENT_URL_TYPES[key] === 'hostname'
        ? createUrlString(value)
        : createUrlString(value, CLIENT_URL_TYPES[key]);
      urlStrings.push(urlStr);
    }
  }
  return urlStrings.join(' ');
});

async function registerSpecUrlHelper () {
  const routesFile = await fs.readFile(path.resolve(rootFolder, '..', 'base-driver', 'lib', 'protocol', 'routes.js'), 'utf8');
  const routesFileLines = routesFile.split('\n');

  Handlebars.registerHelper('spec_url', function specUrl (specUrl, endpoint) {
    // return the url if it is not a link to our routes doc
    if (!specUrl.includes('routes.js')) {
      return specUrl;
    }
    // make sure it is a full url
    if (specUrl.startsWith('routes.js')) {
      specUrl = `https://github.com/appium/appium-base-driver/blob/master/lib/protocol/${specUrl}`;
    }

    // strip off any line numbers
    specUrl = specUrl.split('#L')[0];

    // the endpoint here is often `session_id` and we need `sessionId`
    endpoint = endpoint.replace('session_id', 'sessionId');
    // and `element_id` and we need `elementId`
    endpoint = endpoint.replace('element_id', 'elementId');

    // find the line number for this endpoint
    let index;
    for (const i in routesFileLines) {
      if (routesFileLines[i].includes(endpoint)) {
        // line numbers are 1-indexed
        index = parseInt(i, 10) + 1;
        break;
      }
    }
    if (_.isUndefined(index)) {
      throw new Error(`Unable to find entry in 'appium-base-driver#routes' for endpoint '${endpoint}'`);
    }

    return `${specUrl}#L${index}`;
  });
}

async function generateCommands () {
  await registerSpecUrlHelper();

  const commands = path.resolve(rootFolder, 'commands-yml', 'commands/**/*.yml');
  log('Traversing YML files', commands);
  await fs.rimraf(path.resolve(rootFolder, 'docs', 'en', 'commands'));

  // get the template from which the md files will be created
  const template = Handlebars.compile(await fs.readFile(path.resolve(rootFolder, 'commands-yml', 'template.md'), 'utf8'), {noEscape: true, strict: true});

  let fileCount = 0;
  for (const filename of await fs.glob(commands)) {
    const relativeFilename = path.relative(path.resolve(rootFolder, 'commands-yml'), filename);
    log(`Rendering file: ${filename} ${relativeFilename}`);

    // Translate the YML specs to JSON
    const inputYML = await fs.readFile(filename, 'utf8');
    const inputJSON = yaml.load(inputYML);
    inputJSON.ymlFileName = `/${path.relative(rootFolder, filename)}`;
    const validationErrors = validate(inputJSON, validator);
    if (validationErrors) {
      throw new Error(`Data validation error for ${filename}: ${JSON.stringify(validationErrors)}`);
    }

    // Pass the inputJS into our Handlebars template
    const markdown = template(inputJSON);

    // Write the markdown to its right place
    const ext = path.extname(relativeFilename);
    const markdownPath = `${relativeFilename.substring(0, relativeFilename.length - ext.length)}.md`;
    const outfile = path.resolve(rootFolder, 'docs', 'en', markdownPath);
    log(`    Writing to: ${outfile}`);
    await fs.mkdirp(path.dirname(outfile));
    await fs.writeFile(outfile, markdown, 'utf8');

    fileCount++;
  }
  log(`Done writing ${fileCount} command documents`);
}

async function generateCommandIndex () {
  function getTree (element, path) {
    let node = {
      name: element[0],
    };
    if (!_.isArray(element[1])) {
      node.path = `${path}/${element[1]}`;
    } else {
      node.path = `${path}/${element[1][0]}`;
      const name = element[1].shift();
      node.commands = [];
      for (let subElement of element[1]) {
        node.commands.push(getTree(subElement, `${path}/${name}`));
      }
    }
    return node;
  }

  // parse the toc.js file and get the commands into the form of
  //   {commands: [{name: '', path: ''}, {name: '', commands: [...]}]}
  const toc = require(path.resolve(rootFolder, '../..', 'docs', 'toc.js'));
  const commandToc = _.find(toc.en, (value) => value.indexOf('Commands') === 0);
  const commands = [];
  for (let el of commandToc[1].slice(1)) {
    commands.push(getTree(el, '/docs/en/commands'));
  }

  const commandTemplate = Handlebars.compile(await fs.readFile(path.resolve(rootFolder, 'commands-yml', 'api-template.md'), 'utf8'), {noEscape: true, strict: true});

  async function writeIndex (index, commands, indexPath) {
    log(`Creating API index '${index}'`);
    const commandMarkdown = commandTemplate({
      commands,
      path: indexPath,
    });
    await fs.writeFile(index, commandMarkdown, 'utf8');
  }

  const apiIndex = path.resolve(rootFolder, '../..', 'docs', 'en', 'about-appium', 'api.md');
  await writeIndex(apiIndex, commands);
  log(`Done writing main API index`);

  async function writeIndividualIndexes (command) {
    if (!util.hasValue(command.commands)) {
      // this is a leaf, so end
      return;
    }

    // write this node
    const relPath = command.path.startsWith(path.sep) ? command.path.substring(1) : command.path;
    const index = path.resolve(rootFolder, relPath, 'README.md');
    await writeIndex(index, command.commands, command.path);

    // go through all the sub-commands
    for (const el of command.commands) {
      await writeIndividualIndexes(el);
    }
  }

  // go through the full tree and generate readme files
  const index = path.resolve(rootFolder, '../..', 'docs', 'en', 'commands', 'README.md');
  await writeIndex(index, commands);
  for (const el of commands) {
    await writeIndividualIndexes(el);
  }
}

async function main () {
  await generateCommands();
  await generateCommandIndex();
}

asyncify(main);
