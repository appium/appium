/* eslint-disable no-console */
import path from 'path';
import yaml from 'yaml-js';
import { fs, mkdirp } from 'appium-support';
import validate from 'validate.js';
import Handlebars from 'handlebars';
import replaceExt from 'replace-ext';
import _ from 'lodash';
import { asyncify } from 'asyncbox';
import validator from './validator';
import url from 'url';


// What range of platforms do the driver's support
const platformRanges = {
  xcuitest: ['9.3'],
  uiautomation: ['8.0', '9.3'],
  uiautomator2: ['?'],
  uiautomator: ['4.2'],
  windows: ['10'],
  mac: ['?'], // TODO
};

// When was the driver supported in Appium?
const appiumRanges = {
  xcuitest: ['1.6.0'],
  uiautomator2: ['1.6.0'],
  espresso: ['?'],
  windows: ['1.6.0'],
  mac: ['1.6.4'],
};


// Create Handlebars helper that shows a version range
Handlebars.registerHelper('versions', (object, name, driverName) => {
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

Handlebars.registerHelper('hyphenate', (str) =>  str.replace('_', '-'));
Handlebars.registerHelper('uppercase', (str) => str.toUpperCase());

Handlebars.registerHelper('capitalize', (driverName) => {
  switch (driverName.toLowerCase()) {
    case 'xcuitest':
      return 'XCUITest';
    case 'uiautomation':
      return 'UIAutomation';
    case 'uiautomator2':
      return 'UiAutomator2';
    case 'uiautomator':
      return 'UiAutomator';
    default:
      return driverName.length === 0 ? driverName : driverName[0].toUpperCase() + driverName.substr(1);
  }
});

Handlebars.registerHelper('if_eq', function (a, b, opts) {
  if (a === b) {
    return opts.fn(this);
  } else {
    return opts.inverse(this);
  }
});

Handlebars.registerHelper('base_url', function (fullUrl) {
  const baseUrl = url.parse(fullUrl);
  return baseUrl.hostname;
});

async function generateCommands () {
  const commands = path.resolve(__dirname, 'commands/**/*.yml');
  console.log('Traversing YML files', commands);
  await fs.rimraf(path.resolve(__dirname, '..', 'docs', 'en', 'commands'));
  let fileCount = 0;
  for (let filename of await fs.glob(commands)) {
    console.log('Rendering file:', filename, path.relative(__dirname, filename), path.extname(filename));

    // Translate the YML specs to JSON
    const inputYML = await fs.readFile(filename, 'utf8');
    const inputJSON = yaml.load(inputYML);
    inputJSON.ymlFileName = `/${path.relative(path.resolve(__dirname, '..'), filename)}`;
    const validationErrors = validate(inputJSON, validator);
    if (validationErrors) {
      throw new Error(`Data validation error for ${filename}: ${JSON.stringify(validationErrors)}`);
    }

    // Pass the inputJS into our Handlebars template
    const template = Handlebars.compile(await fs.readFile(path.resolve(__dirname, 'template.md'), 'utf8'), {noEscape: true, strict: true});
    const markdown = template(inputJSON);

    // Write the markdown to its right place
    const markdownPath = replaceExt(path.relative(__dirname, filename), '.md');
    const outfile = path.resolve(__dirname, '..', 'docs', 'en', markdownPath);
    console.log('Writing file to:', outfile);
    await mkdirp(path.dirname(outfile));
    await fs.writeFile(outfile, markdown, 'utf8');

    fileCount++;
  }
  console.log(`Done writing ${fileCount} command documents`);
}

async function generateCommandIndex () {
  const apiIndex = path.resolve(__dirname, '..', 'docs', 'en', 'about-appium', 'api.md');
  console.log(`Creating API index '${apiIndex}'`);

  function getTree (element, path) {
    let node = {
      name: element[0],
    };
    if (!_.isArray(element[1])) {
      node.path = `${path}/${element[1]}`;
    } else {
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
  const toc = require(path.resolve(__dirname, '..', 'docs', 'toc.js'));
  const commandToc = _.find(toc.en, (value) => value.indexOf('Commands') === 0);
  let commands = [];
  for (let el of commandToc[1].slice(1)) {
    commands.push(getTree(el, '/docs/en/commands'));
  }

  const template = Handlebars.compile(await fs.readFile(path.resolve(__dirname, 'api-template.md'), 'utf8'), {noEscape: true, strict: true});
  const markdown = template({commands});
  await fs.writeFile(apiIndex, markdown, 'utf8');
  console.log(`Done writing API index`);
}

async function main () {
  await generateCommands();
  await generateCommandIndex();
}

asyncify(main);
/* eslint-enable */
