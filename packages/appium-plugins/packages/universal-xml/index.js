import UniversalXMLPlugin from './lib/plugin';
export default UniversalXMLPlugin;
export { UniversalXMLPlugin };

if (module === require.main) {
  const { transformSourceXml } = require('./lib/source');
  const fs = require('fs');
  const [,, xmlDataPath, platform, metadataJson] = process.argv;
  const xmlData = fs.readFileSync(xmlDataPath, 'utf8');
  let metadata = {};
  if (metadataJson) {
    metadata = JSON.parse(metadataJson);
  }
  const {xml, unknowns} = transformSourceXml(xmlData, platform, metadata);
  console.log(xml); // eslint-disable-line no-console
  if (unknowns.nodes.length || unknowns.attrs.length) {
    console.error(unknowns); // eslint-disable-line no-console
  }
}
