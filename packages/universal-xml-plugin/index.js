const {main, UniversalXMLPlugin} = require('./build/lib');

if (require.main === module) {
  main();
}

module.exports = {UniversalXMLPlugin};
