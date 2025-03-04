const {main, UniversalXMLPlugin} = require('./build/lib');

if (require.main === module) {
  (async () => await main())();
}

module.exports = {UniversalXMLPlugin};
