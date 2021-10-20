export default [
  {
    schema: {
      $comment: 'I think hostname covers both DNS and IPv4...could be wrong',
      $id: '#/properties/server/properties/address',
      appiumCliAliases: ['a'],
      default: '0.0.0.0',
      description: 'IP address to listen on',
      format: 'hostname',
      title: 'address config',
      type: 'string',
    },
    argSpec: {
      name: 'address',
      id: 'address',
      dest: 'address',
      defaultValue: '0.0.0.0',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/allow-cors',
      default: false,
      description:
        'Whether the Appium server should allow web browser connections from any host',
      title: 'allow-cors config',
      type: 'boolean',
    },
    argSpec: {
      name: 'allow-cors',
      id: 'allow-cors',
      dest: 'allowCors',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/allow-insecure',
      default: [],
      description:
        'Set which insecure features are allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Note that features defined via "deny-insecure" will be disabled, even if also listed here. If string, a path to a text file containing policy or a comma-delimited list.',
      items: {type: 'string'},
      title: 'allow-insecure config',
      type: 'array',
      appiumCliTransformer: 'csv',
      uniqueItems: true,
    },
    argSpec: {
      name: 'allow-insecure',
      id: 'allow-insecure',
      dest: 'allowInsecure',
      defaultValue: [],
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/base-path',
      appiumCliAliases: ['pa'],
      default: '',
      description:
        'Base path to use as the prefix for all webdriver routes running on the server',
      title: 'base-path config',
      type: 'string',
    },
    argSpec: {
      name: 'base-path',
      id: 'base-path',
      dest: 'basePath',
      defaultValue: '',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/callback-address',
      appiumCliAliases: ['ca'],
      description: 'Callback IP address (default: same as "address")',
      title: 'callback-address config',
      type: 'string',
    },
    argSpec: {
      name: 'callback-address',
      id: 'callback-address',
      dest: 'callbackAddress',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/callback-port',
      appiumCliAliases: ['cp'],
      default: 4723,
      description: 'Callback port (default: same as "port")',
      maximum: 65535,
      minimum: 1,
      title: 'callback-port config',
      type: 'integer',
    },
    argSpec: {
      name: 'callback-port',
      id: 'callback-port',
      dest: 'callbackPort',
      defaultValue: 4723,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/debug-log-spacing',
      default: false,
      description:
        'Add exaggerated spacing in logs to help with visual inspection',
      title: 'debug-log-spacing config',
      type: 'boolean',
    },
    argSpec: {
      name: 'debug-log-spacing',
      id: 'debug-log-spacing',
      dest: 'debugLogSpacing',
      defaultValue: false,
    },
  },
  {
    schema: {
      $comment: 'TODO',
      $id: '#/properties/server/properties/default-capabilities',
      appiumCliAliases: ['dc'],
      description:
        'Set the default desired capabilities, which will be set on each session unless overridden by received capabilities. If a string, a path to a JSON file containing the capabilities, or raw JSON.',
      title: 'default-capabilities config',
      type: 'object',
    },
    argSpec: {
      name: 'default-capabilities',
      id: 'default-capabilities',
      dest: 'defaultCapabilities',
    },
  },
  {
    schema: {
      $comment: 'Allowed values are defined by drivers',
      $id: '#/properties/server/properties/deny-insecure',
      default: [],
      description:
        'Set which insecure features are not allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Features listed here will not be enabled even if also listed in "allow-insecure", and even if "relaxed-security" is enabled. If string, a path to a text file containing policy or a comma-delimited list.',
      items: {type: 'string'},
      title: 'deny-insecure config',
      type: 'array',
      appiumCliTransformer: 'csv',
      uniqueItems: true,
    },
    argSpec: {
      name: 'deny-insecure',
      id: 'deny-insecure',
      dest: 'denyInsecure',
      defaultValue: [],
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/drivers',
      default: '',
      description:
        'A list of drivers to activate. By default, all installed drivers will be activated.',
      items: {type: 'string'},
      title: 'drivers config',
      type: 'array',
      uniqueItems: true,
    },
    argSpec: {
      name: 'drivers',
      id: 'drivers',
      dest: 'drivers',
      defaultValue: '',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/keep-alive-timeout',
      appiumCliAliases: ['ka'],
      default: 600,
      description:
        'Number of seconds the Appium server should apply as both the keep-alive timeout and the connection timeout for all requests. A value of 0 disables the timeout.',
      minimum: 0,
      title: 'keep-alive-timeout config',
      type: 'integer',
    },
    argSpec: {
      name: 'keep-alive-timeout',
      id: 'keep-alive-timeout',
      dest: 'keepAliveTimeout',
      defaultValue: 600,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/local-timezone',
      default: false,
      description: 'Use local timezone for timestamps',
      title: 'local-timezone config',
      type: 'boolean',
    },
    argSpec: {
      name: 'local-timezone',
      id: 'local-timezone',
      dest: 'localTimezone',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/log',
      appiumCliAliases: ['g'],
      appiumCliDest: 'logFile',
      description: 'Also send log output to this file',
      title: 'log config',
      type: 'string',
    },
    argSpec: {name: 'log', id: 'log', dest: 'logFile'},
  },
  {
    schema: {
      $comment: 'TODO',
      $id: '#/properties/log-filters',
      description: 'One or more log filtering rules',
      items: {type: 'string'},
      title: 'log-filters config',
      type: 'array',
    },
    argSpec: {name: 'log-filters', id: 'log-filters', dest: 'logFilters'},
  },
  {
    schema: {
      $id: '#/properties/server/properties/log-level',
      appiumCliDest: 'loglevel',
      default: 'debug',
      description: 'Log level (console[:file])',
      enum: [
        'info',
        'info:debug',
        'info:info',
        'info:warn',
        'info:error',
        'warn',
        'warn:debug',
        'warn:info',
        'warn:warn',
        'warn:error',
        'error',
        'error:debug',
        'error:info',
        'error:warn',
        'error:error',
        'debug',
        'debug:debug',
        'debug:info',
        'debug:warn',
        'debug:error',
      ],
      title: 'log-level config',
      type: 'string',
    },
    argSpec: {
      name: 'log-level',
      id: 'log-level',
      dest: 'loglevel',
      defaultValue: 'debug',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/log-no-colors',
      default: false,
      description: 'Do not use color in console output',
      title: 'log-no-colors config',
      type: 'boolean',
    },
    argSpec: {
      name: 'log-no-colors',
      id: 'log-no-colors',
      dest: 'logNoColors',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/log-timestamp',
      default: false,
      description: 'Show timestamps in console output',
      title: 'log-timestamp config',
      type: 'boolean',
    },
    argSpec: {
      name: 'log-timestamp',
      id: 'log-timestamp',
      dest: 'logTimestamp',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/long-stacktrace',
      default: false,
      description:
        'Add long stack traces to log entries. Recommended for debugging only.',
      title: 'long-stacktrace config',
      type: 'boolean',
    },
    argSpec: {
      name: 'long-stacktrace',
      id: 'long-stacktrace',
      dest: 'longStacktrace',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/no-perms-check',
      default: false,
      description:
        'Do not check that needed files are readable and/or writable',
      title: 'no-perms-check config',
      type: 'boolean',
    },
    argSpec: {
      name: 'no-perms-check',
      id: 'no-perms-check',
      dest: 'noPermsCheck',
      defaultValue: false,
    },
  },
  {
    schema: {
      $comment:
        'Selenium Grid 3 is unmaintained and Selenium Grid 4 no longer supports this file.',
      $id: '#/properties/server/properties/nodeconfig',
      default: '',
      description:
        'Path to configuration JSON file to register Appium as a node with Selenium Grid 3; otherwise the configuration itself',
      title: 'nodeconfig config',
      type: 'object',
    },
    argSpec: {
      name: 'nodeconfig',
      id: 'nodeconfig',
      dest: 'nodeconfig',
      defaultValue: '',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/plugins',
      default: '',
      description:
        'A list of plugins to activate. To activate all plugins, use the single string "all"',
      items: {type: 'string'},
      title: 'plugins config',
      type: 'array',
      uniqueItems: true,
    },
    argSpec: {
      name: 'plugins',
      id: 'plugins',
      dest: 'plugins',
      defaultValue: '',
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/port',
      appiumCliAliases: ['p'],
      default: 4723,
      description: 'Port to listen on',
      maximum: 65535,
      minimum: 1,
      title: 'port config',
      type: 'integer',
    },
    argSpec: {name: 'port', id: 'port', dest: 'port', defaultValue: 4723},
  },
  {
    schema: {
      $id: '#/properties/server/properties/relaxed-security',
      default: false,
      description:
        'Disable additional security checks, so it is possible to use some advanced features, provided by drivers supporting this option. Only enable it if all the clients are in the trusted network and it\'s not the case if a client could potentially break out of the session sandbox. Specific features can be overridden by using "deny-insecure"',
      title: 'relaxed-security config',
      type: 'boolean',
    },
    argSpec: {
      name: 'relaxed-security',
      id: 'relaxed-security',
      dest: 'relaxedSecurity',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/session-override',
      default: false,
      description: 'Enables session override (clobbering)',
      title: 'session-override config',
      type: 'boolean',
    },
    argSpec: {
      name: 'session-override',
      id: 'session-override',
      dest: 'sessionOverride',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/strict-caps',
      default: false,
      description:
        'Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device',
      title: 'strict-caps config',
      type: 'boolean',
    },
    argSpec: {
      name: 'strict-caps',
      id: 'strict-caps',
      dest: 'strictCaps',
      defaultValue: false,
    },
  },
  {
    schema: {
      $id: '#/properties/server/properties/tmp',
      description:
        'Absolute path to directory Appium can use to manage temp files. Defaults to C:\\Windows\\Temp on Windows and /tmp otherwise.',
      title: 'tmp config',
      type: 'string',
    },
    argSpec: {name: 'tmp', id: 'tmp', dest: 'tmp'},
  },
  {
    schema: {
      $id: '#/properties/server/properties/trace-dir',
      description:
        'Absolute path to directory Appium can use to save iOS instrument traces; defaults to <tmp>/appium-instruments',
      title: 'trace-dir config',
      type: 'string',
    },
    argSpec: {name: 'trace-dir', id: 'trace-dir', dest: 'traceDir'},
  },
  {
    schema: {
      $comment:
        'This should probably use a uri-template format to restrict the protocol to http/https',
      $id: '#/properties/server/properties/webhook',
      appiumCliAliases: ['G'],
      description: 'Also send log output to this http listener',
      format: 'uri',
      title: 'webhook config',
      type: 'string',
    },
    argSpec: {name: 'webhook', id: 'webhook', dest: 'webhook'},
  },
];
