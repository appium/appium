/* eslint-disable no-console */
import path from 'path';
import yaml from 'yaml-js';
import { fs } from 'appium-support';
import validate from 'validate.js';
import Handlebars from 'handlebars';
import replaceExt from 'replace-ext';
import _ from 'lodash';
import validator from './validator';

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
    if (name === 'appium' && appiumRanges[driverName]) {
      min = appiumRanges[driverName][0];
    } else if (name === 'platform' && platformRanges[driverName]) {
      min = platformRanges[driverName][0];
      console.log('!!!setting min', min);
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
  } else {
    return `${min} to ${max}`;
  }
});

Handlebars.registerHelper('hyphenate', (str) => {
  return str.replace('_', '-');
});

Handlebars.registerHelper('uppercase', (str) => {
  return str.toUpperCase();
});

Handlebars.registerHelper('capitalize', (driverName) => {
  switch (driverName) {
    case 'xcuitest':
      return 'XCUITest';
    case 'uiautomation':
      return 'UIAutomation';
    case 'uiautomator2':
      return 'UiAutomator2';
    case 'uiautomator':
      return 'UiAutomator';
    default:
      return driverName[0].toUpperCase() + driverName.substr(1);
  }
});

(async function () {
  try {
    const commands = path.resolve(__dirname, 'commands/**/*.yml');
    console.log('Traversing YML files', commands);
    for (let filename of await fs.glob(commands)) {
      console.log('Rendering file:', filename, path.relative(__dirname, filename), path.extname(filename));

      // Translate the YML specs to JS
      const inputYML = await fs.readFile(filename, 'utf8');
      const inputJS = yaml.load(inputYML);
      const validationErrors = validate(inputJS, validator);
      if (validationErrors) {
        throw new Error(validationErrors);
      }

      // Pass the inputJS into our Handlebars template
      const template = Handlebars.compile(await fs.readFile(path.resolve(__dirname, 'template.md'), 'utf8'), {noEscape: true, strict: true});
      const markdown = template(inputJS);

      // Write the markdown to it's right place
      const markdownPath = replaceExt(path.relative(__dirname, filename), '.md');
      const outfile = path.resolve(__dirname, '..', 'docs', 'en', markdownPath);
      console.log('Writing file to:', outfile);
      await fs.writeFile(outfile, markdown, 'utf8');
    }
  } catch (e) {
    console.error(e);
    process.exit(-1);
  }
})();
/* eslint-enable */
