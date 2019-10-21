const globalArgs = [
  [['--json'], {
    required: false,
    defaultValue: false,
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
    help: 'List only installed drivers',
    nargs: 0,
    dest: 'showInstalled'
  }],
  [['--updates'], {
    required: false,
    defaultValue: false,
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
  [['--npm'], {
    required: false,
    defaultValue: false,
    nargs: 0,
    help: 'Specify that the driver name provided is an NPM package',
    dest: 'npm'
  }],
  [['--github'], {
    required: false,
    defaultValue: false,
    nargs: 0,
    help: 'Specify that the driver name provided is a GitHub repository of form org/repo',
    dest: 'github'
  }],
  [['--git'], {
    required: false,
    defaultValue: false,
    nargs: 0,
    help: 'Specify that the driver name provided is the URL of a Git repository',
    dest: 'git'
  }],
  [['--local'], {
    required: false,
    defaultValue: false,
    nargs: 0,
    help: 'Specify that the driver name provided is an absolute path to a ' +
          'local directory containing the driver which will be installed using ' +
          'npm link',
    dest: 'local'
  }]
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

function addDriverToParser (subParsers, debug) {
  const driverParser = subParsers.addParser('driver', {
    addHelp: true,
    help: 'Access the driver management CLI commands',
    debug
  });
  const driverSubParsers = driverParser.addSubparsers({dest: 'driverCommand'});
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
    for (const [flags, opts] of args) {
      // addArgument mutates params so make sure to send in copies instead
      parser.addArgument([...flags], {...opts});
    }
  }
}

export {
  addDriverToParser
};
