// for simplicity this file is not transpiled and is run directly via an npm script
/* eslint-disable no-console */
/* eslint-disable promise/prefer-await-to-callbacks */
/* eslint-disable promise/prefer-await-to-then */

const path = require('path');
const {fs} = require('@appium/support');
const {AppiumConfigJsonSchema} = require('@appium/schema');

const DOC_PATH = path.resolve(__dirname, '..', 'en', 'cli', 'args.md');

const START_TAG = `<!-- AUTOGEN-START -->`;
const STOP_TAG = `<!-- AUTOGEN-STOP -->`;

async function main() {
  console.log(`Gathering current cli doc file contents...`);
  const [preStart, postEnd] = await getDocParts();
  console.log(`Generating new cli arg table...`);
  const argTable = getCliArgTable();
  console.log(`Writing new doc file...`);
  await writeNewDoc(preStart, argTable, postEnd);
  console.log(`...done!`);
}

async function getDocParts() {
  if (!(await fs.exists(DOC_PATH))) {
    throw new Error(`Cannot find args.md at ${DOC_PATH}`);
  }

  const curContents = await fs.readFile(DOC_PATH, 'utf-8');

  // attempt to verify the start/stop tags
  const [preStart, postStart] = curContents.split(START_TAG);
  if (!postStart) {
    throw new Error(`Could not find autogen start tag '${START_TAG}'. Make sure it's in place!`);
  }
  const [, postEnd] = postStart.split(STOP_TAG);
  if (!postEnd) {
    throw new Error(`Could not find autogen stop tag '${STOP_TAG}'. Make sure it's in place!`);
  }

  return [preStart, postEnd];
}

function getCliArgTable() {
  const pad = '&nbsp;'.repeat(30);
  const header = `|Argument${pad}|Description|Type|Default|Aliases|\n` + `|--|--|--|--|--|`;
  const serverProps = AppiumConfigJsonSchema.properties.server.properties;
  const args = Object.keys(serverProps).map((arg) => {
    let {appiumCliAliases = [], description, type, items, maximum, minimum} = serverProps[arg];
    let def = serverProps[arg].default;
    let enums = serverProps[arg].enum;
    if (type === 'array' || type === 'object' || (type === 'string' && def === '')) {
      def = JSON.stringify(def);
    }
    if (type === 'array' && items.type) {
      type = `array<${items.type}>`;
    }
    if (type === 'integer' && typeof minimum !== 'undefined' && typeof maximum !== 'undefined') {
      description = `${description} (Value must be between \`${minimum}\` and \`${maximum}\`)`;
    }
    if (enums) {
      const enumsFormatted = enums.map((e) => `\`${e}\``).join(', ');
      description = `${description} (Value must be one of: ${enumsFormatted})`;
    }
    return {
      arg: `--${arg}`,
      aliases: appiumCliAliases.map((a) => `-${a}`),
      type,
      def,
      description,
    };
  });
  const body = args
    .map(({arg, aliases, type, def, description}) => {
      const aliasStr = aliases.map((a) => `\`${a}\``).join(', ');
      def = typeof def !== 'undefined' ? `\`${def}\`` : '';
      return `|\`${arg}\`|${description}|${type}|${def}|${aliasStr}|`;
    })
    .join('\n');
  return `${header}\n${body}`;
}

async function writeNewDoc(preStart, argTable, postEnd) {
  const newContents = `${preStart}${START_TAG}\n${argTable}\n${STOP_TAG}${postEnd}`;
  await fs.writeFile(DOC_PATH, newContents);
}

if (require.main === module) {
  main().catch((err) => {
    throw err;
  });
}

module.exports = main;
