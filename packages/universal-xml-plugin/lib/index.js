import UniversalXMLPlugin from './plugin';
export default UniversalXMLPlugin;
export { UniversalXMLPlugin };

export function main () {
  const { transformSourceXml } = require('./source');
  const fs = require('fs');
  const [,, xmlDataPath, platform, optsJson] = process.argv;
  const xmlData = fs.readFileSync(xmlDataPath, 'utf8');
  let opts = {};
  if (optsJson) {
    opts = JSON.parse(optsJson);
  }
  const {xml, unknowns} = transformSourceXml(xmlData, platform, opts);
  console.log(xml); // eslint-disable-line no-console
  if (unknowns.nodes.length || unknowns.attrs.length) {
    console.error(unknowns); // eslint-disable-line no-console
  }
}
