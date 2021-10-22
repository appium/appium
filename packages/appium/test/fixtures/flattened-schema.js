export default [
  {
    schema: {
      $comment: 'I think hostname covers both DNS and IPv4...could be wrong',
      appiumCliAliases: ['a'],
      default: '0.0.0.0',
      description: 'IP address to listen on',
      format: 'hostname',
      title: 'address config',
      type: 'string',
    },
    argSpec: {
      name: 'address',
      ref: 'appium.json#/properties/server/properties/address',
      arg: 'address',
      dest: 'address',
      defaultValue: '0.0.0.0',
    },
  },
  {
    schema: {
      default: false,
      description:
        'Whether the Appium server should allow web browser connections from any host',
      title: 'allow-cors config',
      type: 'boolean',
    },
    argSpec: {
      name: 'allow-cors',
      ref: 'appium.json#/properties/server/properties/allow-cors',
      arg: 'allow-cors',
      dest: 'allowCors',
      defaultValue: false,
    },
  },
  {
    schema: {
      appiumCliTransformer: 'csv',
      default: [],
      description:
        'Set which insecure features are allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Note that features defined via "deny-insecure" will be disabled, even if also listed here. If string, a path to a text file containing policy or a comma-delimited list.',
      items: {type: 'string'},
      title: 'allow-insecure config',
      type: 'array',
      uniqueItems: true,
    },
    argSpec: {
      name: 'allow-insecure',
      ref: 'appium.json#/properties/server/properties/allow-insecure',
      arg: 'allow-insecure',
      dest: 'allowInsecure',
      defaultValue: [],
    },
  },
  {
    schema: {
      appiumCliAliases: ['pa'],
      default: '',
      description:
        'Base path to use as the prefix for all webdriver routes running on the server',
      title: 'base-path config',
      type: 'string',
    },
    argSpec: {
      name: 'base-path',
      ref: 'appium.json#/properties/server/properties/base-path',
      arg: 'base-path',
      dest: 'basePath',
      defaultValue: '',
    },
  },
  {
    schema: {
      appiumCliAliases: ['ca'],
      description: 'Callback IP address (default: same as "address")',
      title: 'callback-address config',
      type: 'string',
    },
    argSpec: {
      name: 'callback-address',
      ref: 'appium.json#/properties/server/properties/callback-address',
      arg: 'callback-address',
      dest: 'callbackAddress',
    },
  },
  {
    schema: {
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
      ref: 'appium.json#/properties/server/properties/callback-port',
      arg: 'callback-port',
      dest: 'callbackPort',
      defaultValue: 4723,
    },
  },
  {
    schema: {
      default: false,
      description:
        'Add exaggerated spacing in logs to help with visual inspection',
      title: 'debug-log-spacing config',
      type: 'boolean',
    },
    argSpec: {
      name: 'debug-log-spacing',
      ref: 'appium.json#/properties/server/properties/debug-log-spacing',
      arg: 'debug-log-spacing',
      dest: 'debugLogSpacing',
      defaultValue: false,
    },
  },
  {
    schema: {
      $comment: 'TODO',
      appiumCliAliases: ['dc'],
      description:
        'Set the default desired capabilities, which will be set on each session unless overridden by received capabilities. If a string, a path to a JSON file containing the capabilities, or raw JSON.',
      title: 'default-capabilities config',
      type: 'object',
    },
    argSpec: {
      name: 'default-capabilities',
      ref: 'appium.json#/properties/server/properties/default-capabilities',
      arg: 'default-capabilities',
      dest: 'defaultCapabilities',
    },
  },
  {
    schema: {
      $comment: 'Allowed values are defined by drivers',
      appiumCliTransformer: 'csv',
      default: [],
      description:
        'Set which insecure features are not allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Features listed here will not be enabled even if also listed in "allow-insecure", and even if "relaxed-security" is enabled. If string, a path to a text file containing policy or a comma-delimited list.',
      items: {type: 'string'},
      title: 'deny-insecure config',
      type: 'array',
      uniqueItems: true,
    },
    argSpec: {
      name: 'deny-insecure',
      ref: 'appium.json#/properties/server/properties/deny-insecure',
      arg: 'deny-insecure',
      dest: 'denyInsecure',
      defaultValue: [],
    },
  },
  {
    schema: {
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
      ref: 'appium.json#/properties/server/properties/keep-alive-timeout',
      arg: 'keep-alive-timeout',
      dest: 'keepAliveTimeout',
      defaultValue: 600,
    },
  },
  {
    schema: {
      default: false,
      description: 'Use local timezone for timestamps',
      title: 'local-timezone config',
      type: 'boolean',
    },
    argSpec: {
      name: 'local-timezone',
      ref: 'appium.json#/properties/server/properties/local-timezone',
      arg: 'local-timezone',
      dest: 'localTimezone',
      defaultValue: false,
    },
  },
  {
    schema: {
      appiumCliAliases: ['g'],
      appiumCliDest: 'logFile',
      description: 'Also send log output to this file',
      title: 'log config',
      type: 'string',
    },
    argSpec: {
      name: 'log',
      ref: 'appium.json#/properties/server/properties/log',
      arg: 'log',
      dest: 'logFile',
    },
  },
  {
    schema: {
      $comment: 'TODO',
      description: 'One or more log filtering rules',
      items: {type: 'string'},
      title: 'log-filters config',
      type: 'array',
    },
    argSpec: {
      name: 'log-filters',
      ref: 'appium.json#/properties/server/properties/log-filters',
      arg: 'log-filters',
      dest: 'logFilters',
    },
  },
  {
    schema: {
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
      ref: 'appium.json#/properties/server/properties/log-level',
      arg: 'log-level',
      dest: 'loglevel',
      defaultValue: 'debug',
    },
  },
  {
    schema: {
      default: false,
      description: 'Do not use color in console output',
      title: 'log-no-colors config',
      type: 'boolean',
    },
    argSpec: {
      name: 'log-no-colors',
      ref: 'appium.json#/properties/server/properties/log-no-colors',
      arg: 'log-no-colors',
      dest: 'logNoColors',
      defaultValue: false,
    },
  },
  {
    schema: {
      default: false,
      description: 'Show timestamps in console output',
      title: 'log-timestamp config',
      type: 'boolean',
    },
    argSpec: {
      name: 'log-timestamp',
      ref: 'appium.json#/properties/server/properties/log-timestamp',
      arg: 'log-timestamp',
      dest: 'logTimestamp',
      defaultValue: false,
    },
  },
  {
    schema: {
      default: false,
      description:
        'Add long stack traces to log entries. Recommended for debugging only.',
      title: 'long-stacktrace config',
      type: 'boolean',
    },
    argSpec: {
      name: 'long-stacktrace',
      ref: 'appium.json#/properties/server/properties/long-stacktrace',
      arg: 'long-stacktrace',
      dest: 'longStacktrace',
      defaultValue: false,
    },
  },
  {
    schema: {
      default: false,
      description:
        'Do not check that needed files are readable and/or writable',
      title: 'no-perms-check config',
      type: 'boolean',
    },
    argSpec: {
      name: 'no-perms-check',
      ref: 'appium.json#/properties/server/properties/no-perms-check',
      arg: 'no-perms-check',
      dest: 'noPermsCheck',
      defaultValue: false,
    },
  },
  {
    schema: {
      $comment:
        'Selenium Grid 3 is unmaintained and Selenium Grid 4 no longer supports this file.',
      description:
        'Path to configuration JSON file to register Appium as a node with Selenium Grid 3; otherwise the configuration itself',
      title: 'nodeconfig config',
      type: 'object',
    },
    argSpec: {
      name: 'nodeconfig',
      ref: 'appium.json#/properties/server/properties/nodeconfig',
      arg: 'nodeconfig',
      dest: 'nodeconfig',
    },
  },
  {
    schema: {
      appiumCliAliases: ['p'],
      default: 4723,
      description: 'Port to listen on',
      maximum: 65535,
      minimum: 1,
      title: 'port config',
      type: 'integer',
    },
    argSpec: {
      name: 'port',
      ref: 'appium.json#/properties/server/properties/port',
      arg: 'port',
      dest: 'port',
      defaultValue: 4723,
    },
  },
  {
    schema: {
      default: false,
      description:
        'Disable additional security checks, so it is possible to use some advanced features, provided by drivers supporting this option. Only enable it if all the clients are in the trusted network and it\'s not the case if a client could potentially break out of the session sandbox. Specific features can be overridden by using "deny-insecure"',
      title: 'relaxed-security config',
      type: 'boolean',
    },
    argSpec: {
      name: 'relaxed-security',
      ref: 'appium.json#/properties/server/properties/relaxed-security',
      arg: 'relaxed-security',
      dest: 'relaxedSecurity',
      defaultValue: false,
    },
  },
  {
    schema: {
      default: false,
      description: 'Enables session override (clobbering)',
      title: 'session-override config',
      type: 'boolean',
    },
    argSpec: {
      name: 'session-override',
      ref: 'appium.json#/properties/server/properties/session-override',
      arg: 'session-override',
      dest: 'sessionOverride',
      defaultValue: false,
    },
  },
  {
    schema: {
      default: false,
      description:
        'Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device',
      title: 'strict-caps config',
      type: 'boolean',
    },
    argSpec: {
      name: 'strict-caps',
      ref: 'appium.json#/properties/server/properties/strict-caps',
      arg: 'strict-caps',
      dest: 'strictCaps',
      defaultValue: false,
    },
  },
  {
    schema: {
      description:
        'Absolute path to directory Appium can use to manage temp files. Defaults to C:\\Windows\\Temp on Windows and /tmp otherwise.',
      title: 'tmp config',
      type: 'string',
    },
    argSpec: {
      name: 'tmp',
      ref: 'appium.json#/properties/server/properties/tmp',
      arg: 'tmp',
      dest: 'tmp',
    },
  },
  {
    schema: {
      description:
        'Absolute path to directory Appium can use to save iOS instrument traces; defaults to <tmp>/appium-instruments',
      title: 'trace-dir config',
      type: 'string',
    },
    argSpec: {
      name: 'trace-dir',
      ref: 'appium.json#/properties/server/properties/trace-dir',
      arg: 'trace-dir',
      dest: 'traceDir',
    },
  },
  {
    schema: {
      description:
        'A list of drivers to activate. By default, all installed drivers will be activated.',
      appiumCliDescription:
        'A list of drivers to activate. Can be a comma-delimited string or path to CSV file. By default, all installed drivers will be activated.',
      items: {type: 'string'},
      title: 'use-drivers config',
      type: 'array',
      uniqueItems: true,
    },
    argSpec: {
      name: 'use-drivers',
      ref: 'appium.json#/properties/server/properties/use-drivers',
      arg: 'use-drivers',
      dest: 'useDrivers',
    },
  },
  {
    schema: {
      description:
        'A list of plugins to activate. To activate all plugins, the value should be an array with a single item "all".',
      appiumCliDescription:
        'A list of plugins to activate. Can be a comma-delimited string, path to CSV file, or the string "all" to use all installed plugins.',
      items: {type: 'string'},
      title: 'use-plugins config',
      type: 'array',
      uniqueItems: true,
    },
    argSpec: {
      name: 'use-plugins',
      ref: 'appium.json#/properties/server/properties/use-plugins',
      arg: 'use-plugins',
      dest: 'usePlugins',
    },
  },
  {
    schema: {
      $comment:
        'This should probably use a uri-template format to restrict the protocol to http/https',
      appiumCliAliases: ['G'],
      description: 'Also send log output to this http listener',
      format: 'uri',
      title: 'webhook config',
      type: 'string',
    },
    argSpec: {
      name: 'webhook',
      ref: 'appium.json#/properties/server/properties/webhook',
      arg: 'webhook',
      dest: 'webhook',
    },
  },
];
