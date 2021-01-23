import UniversalXMLPlugin from './lib/plugin';
export default UniversalXMLPlugin;
export { UniversalXMLPlugin };

if (module === require.main) {
  const { transformSourceXml } = require('./lib/source');
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
