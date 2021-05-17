import log from '../logger';
import _ from 'lodash';


const commands = {}, helpers = {}, extensions = {};

// override in sub-classes, with appropriate logs
// in the form of
//   {
//     type: {
//       description: 'some useful text',
//       getter: () => {}, // some function that will be called to get the logs
//     }
//   }
extensions.supportedLogTypes = {};

// eslint-disable-next-line require-await
commands.getLogTypes = async function getLogTypes () {
  log.debug('Retrieving supported log types');
  return _.keys(this.supportedLogTypes);
};

commands.getLog = async function getLog (logType) {
  log.debug(`Retrieving '${logType}' logs`);

  if (!(await this.getLogTypes()).includes(logType)) {
    const logsTypesWithDescriptions = _.reduce(this.supportedLogTypes, (acc, value, key) => {
      acc[key] = value.description;
      return acc;
    }, {});
    throw new Error(`Unsupported log type '${logType}'. ` +
      `Supported types: ${JSON.stringify(logsTypesWithDescriptions)}`);
  }

  return await this.supportedLogTypes[logType].getter(this);
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
