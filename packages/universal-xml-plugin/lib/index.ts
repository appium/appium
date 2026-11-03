export {UniversalXMLPlugin} from './plugin.js';
export {transformSourceXml} from './source.js';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import {UniversalXMLPlugin} from './plugin.js';
import {transformSourceXml} from './source.js';

export default UniversalXMLPlugin;

/**
 * CLI entrypoint for transforming source XML.
 */
export async function main(): Promise<void> {
  const [, , xmlDataPath, platform, optsJson] = process.argv;

  // Handle smoke test flag
  if (xmlDataPath === '--smoke-test') {
    // Module loaded successfully, exit with code 0
    process.exit(0);
  }

  if (!xmlDataPath || !platform) {
    console.error('Usage: node index.js <xmlDataPath> <platform> [optsJson]'); // eslint-disable-line no-console
    process.exit(1);
  }

  const xmlData = await fs.readFile(xmlDataPath, 'utf8');
  const opts = optsJson ? JSON.parse(optsJson) : {};
  const {xml, unknowns} = await transformSourceXml(xmlData, platform, opts);
  console.log(xml); // eslint-disable-line no-console
  if (unknowns.nodes.length || unknowns.attrs.length) {
    console.error(unknowns); // eslint-disable-line no-console
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main();
}
