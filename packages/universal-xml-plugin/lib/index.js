import {UniversalXMLPlugin} from './plugin';
import {transformSourceXml} from './source';
import fs from 'node:fs/promises';
export default UniversalXMLPlugin;
export {UniversalXMLPlugin};

export async function main() {
  const [, , xmlDataPath, platform, optsJson] = process.argv;
  const xmlData = await fs.readFile(xmlDataPath, 'utf8');
  const opts = optsJson ? JSON.parse(optsJson) : {};
  const {xml, unknowns} = await transformSourceXml(xmlData, platform, opts);
  console.log(xml); // eslint-disable-line no-console
  if (unknowns.nodes.length || unknowns.attrs.length) {
    console.error(unknowns); // eslint-disable-line no-console
  }
}
