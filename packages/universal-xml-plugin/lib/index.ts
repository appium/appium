export {UniversalXMLPlugin} from './plugin';
export {transformSourceXml} from './source';
import fs from 'node:fs/promises';
import {transformSourceXml} from './source';
import {UniversalXMLPlugin} from './plugin';

export default UniversalXMLPlugin;

export async function main(): Promise<void> {
  const [, , xmlDataPath, platform, optsJson] = process.argv;
  const xmlData = await fs.readFile(xmlDataPath, 'utf8');
  const opts = optsJson ? JSON.parse(optsJson) : {};
  const {xml, unknowns} = await transformSourceXml(xmlData, platform, opts);
  console.log(xml); // eslint-disable-line no-console
  if (unknowns.nodes.length || unknowns.attrs.length) {
    console.error(unknowns); // eslint-disable-line no-console
  }
}

if (require.main === module) {
  (async () => await main())();
}
