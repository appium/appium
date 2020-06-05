import _ from 'lodash';
import { INSTALL_TYPES } from './driver-config';

const globalArgs = [
  [['--json'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'Use JSON for output format',
    nargs: 0,
    dest: 'json'
  }]
];

const listArgs = [
  ...globalArgs,
  [['--installed'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'List only installed drivers',
    nargs: 0,
    dest: 'showInstalled'
  }],
  [['--updates'], {
    required: false,
    defaultValue: false,
    action: 'storeTrue',
    help: 'Show information about newer versions',
    nargs: 0,
    dest: 'showUpdates'
  }]
];

const installArgs = [
  ...globalArgs,
  [['driver'], {
    type: 'string',
    example: 'xcuitest',
    help: 'Name of the driver to install',
  }],
  [['--source'], {
    required: false,
    defaultValue: null,
    type: parseInstallTypes,
    help: `Where to look for the driver if it is not one of Appium's verified ` +
          `drivers. Possible values: ${JSON.stringify(INSTALL_TYPES)}`,
    dest: 'installType'
  }],
];

const uninstallArgs = [
  ...globalArgs,
  [['driver'], {
    type: 'string',
    example: 'xcuitest',
    help: 'Name of the driver to uninstall',
  }],
];

const updateArgs = [
  ...globalArgs,
  [['driver'], {
    type: 'string',
    example: 'xcuitest',
    help: 'Name of the driver to update, or the word "all" to update all. To see available updates, run "appium driver list --installed --updates"',
  }],
];

function addDriverToParser (sharedArgs, subParsers, debug) {
  const driverParser = subParsers.addParser('driver', {
    addHelp: true,
    help: 'Access the driver management CLI commands',
    debug
  });
  const driverSubParsers = driverParser.addSubparsers({
    dest: 'driverCommand',
    debug
  });
  const parserSpecs = [
    {command: 'list', args: listArgs,
     help: 'List available and installed drivers'},
    {command: 'install', args: installArgs,
     help: 'Install a driver'},
    {command: 'uninstall', args: uninstallArgs,
     help: 'Uninstall a driver'},
    {command: 'update', args: updateArgs,
     help: 'Update installed drivers to the latest version'},
  ];

  for (const {command, args, help} of parserSpecs) {
    const parser = driverSubParsers.addParser(command, {help, debug});
    for (const [flags, opts] of [...sharedArgs, ...args]) {
      // addArgument mutates params so make sure to send in copies instead
      parser.addArgument([...flags], {...opts});
    }
  }
}

function parseInstallTypes (source) {
  if (!_.includes(INSTALL_TYPES, source)) {
    throw `Argument to --source was '${source}', which is not a valid ` +
          `driver source type. It must be one of ${JSON.stringify(INSTALL_TYPES)}`;
  }

  return source;
}

export {
  addDriverToParser
};
