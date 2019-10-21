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
    dest: 'installed'
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
    help: 'Specify that the driver name provided is a Git repository with the name being the Git repository to clone',
    dest: 'git'
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

function addDriverToParser (subParsers) {
  const driverParser = subParsers.addParser('driver', {
    addHelp: true,
    help: 'Access the driver management CLI commands'
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
    const parser = driverSubParsers.addParser(command, {help});
    for (const [flags, opts] of args) {
      parser.addArgument(flags, opts);
    }
  }
}

export {
  addDriverToParser
};
