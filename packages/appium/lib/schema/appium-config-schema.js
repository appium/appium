export default {
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  title: 'Appium Configuration',
  description: 'A schema for Appium configuration files',
  properties: {
    server: {
      type: 'object',
      title: 'server config',
      description: 'Configuration when running Appium as a server',
      properties: {
        address: {
          $comment:
            'I think hostname covers both DNS and IPv4...could be wrong',
          appiumCliAliases: ['a'],
          default: '0.0.0.0',
          description: 'IP address to listen on',
          format: 'hostname',
          title: 'address config',
          type: 'string',
        },
        'allow-cors': {
          default: false,
          description:
            'Whether the Appium server should allow web browser connections from any host',
          title: 'allow-cors config',
          type: 'boolean',
        },
        'allow-insecure': {
          appiumCliTransformer: 'csv',
          default: [],
          description:
            'Set which insecure features are allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Note that features defined via "deny-insecure" will be disabled, even if also listed here. If string, a path to a text file containing policy or a comma-delimited list.',
          items: {
            type: 'string',
          },
          title: 'allow-insecure config',
          type: 'array',
          uniqueItems: true,
        },
        'base-path': {
          appiumCliAliases: ['pa'],
          default: '',
          description:
            'Base path to use as the prefix for all webdriver routes running on the server',
          title: 'base-path config',
          type: 'string',
        },
        'callback-address': {
          appiumCliAliases: ['ca'],
          description: 'Callback IP address (default: same as "address")',
          title: 'callback-address config',
          type: 'string',
        },
        'callback-port': {
          appiumCliAliases: ['cp'],
          default: 4723,
          description: 'Callback port (default: same as "port")',
          maximum: 65535,
          minimum: 1,
          title: 'callback-port config',
          type: 'integer',
        },
        'debug-log-spacing': {
          default: false,
          description:
            'Add exaggerated spacing in logs to help with visual inspection',
          title: 'debug-log-spacing config',
          type: 'boolean',
        },
        'default-capabilities': {
          $comment: 'TODO',
          appiumCliAliases: ['dc'],
          description:
            'Set the default desired capabilities, which will be set on each session unless overridden by received capabilities. If a string, a path to a JSON file containing the capabilities, or raw JSON.',
          title: 'default-capabilities config',
          type: 'object',
        },
        'deny-insecure': {
          $comment: 'Allowed values are defined by drivers',
          appiumCliTransformer: 'csv',
          default: [],
          description:
            'Set which insecure features are not allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Features listed here will not be enabled even if also listed in "allow-insecure", and even if "relaxed-security" is enabled. If string, a path to a text file containing policy or a comma-delimited list.',
          items: {
            type: 'string',
          },
          title: 'deny-insecure config',
          type: 'array',
          uniqueItems: true,
        },
        driver: {
          type: 'object',
          title: 'driver config',
          description:
            'Driver-specific configuration. Keys should correspond to driver package names',
        },
        'keep-alive-timeout': {
          appiumCliAliases: ['ka'],
          default: 600,
          description:
            'Number of seconds the Appium server should apply as both the keep-alive timeout and the connection timeout for all requests. A value of 0 disables the timeout.',
          minimum: 0,
          title: 'keep-alive-timeout config',
          type: 'integer',
        },
        'local-timezone': {
          default: false,
          description: 'Use local timezone for timestamps',
          title: 'local-timezone config',
          type: 'boolean',
        },
        log: {
          appiumCliAliases: ['g'],
          appiumCliDest: 'logFile',
          description: 'Also send log output to this file',
          title: 'log config',
          type: 'string',
        },
        'log-filters': {
          $comment: 'TODO',
          description: 'One or more log filtering rules',
          items: {
            type: 'string',
          },
          title: 'log-filters config',
          type: 'array',
        },
        'log-level': {
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
        'log-no-colors': {
          default: false,
          description: 'Do not use color in console output',
          title: 'log-no-colors config',
          type: 'boolean',
        },
        'log-timestamp': {
          default: false,
          description: 'Show timestamps in console output',
          title: 'log-timestamp config',
          type: 'boolean',
        },
        'long-stacktrace': {
          default: false,
          description:
            'Add long stack traces to log entries. Recommended for debugging only.',
          title: 'long-stacktrace config',
          type: 'boolean',
        },
        'no-perms-check': {
          default: false,
          description:
            'Do not check that needed files are readable and/or writable',
          title: 'no-perms-check config',
          type: 'boolean',
        },
        nodeconfig: {
          $comment:
            'Selenium Grid 3 is unmaintained and Selenium Grid 4 no longer supports this file.',
          description:
            'Path to configuration JSON file to register Appium as a node with Selenium Grid 3; otherwise the configuration itself',
          title: 'nodeconfig config',
          type: 'object',
        },
        plugin: {
          type: 'object',
          title: 'plugin config',
          description:
            'Plugin-specific configuration. Keys should correspond to plugin package names',
        },
        port: {
          appiumCliAliases: ['p'],
          default: 4723,
          description: 'Port to listen on',
          maximum: 65535,
          minimum: 1,
          title: 'port config',
          type: 'integer',
        },
        'relaxed-security': {
          default: false,
          description:
            'Disable additional security checks, so it is possible to use some advanced features, provided by drivers supporting this option. Only enable it if all the clients are in the trusted network and it\'s not the case if a client could potentially break out of the session sandbox. Specific features can be overridden by using "deny-insecure"',
          title: 'relaxed-security config',
          type: 'boolean',
        },
        'session-override': {
          default: false,
          description: 'Enables session override (clobbering)',
          title: 'session-override config',
          type: 'boolean',
        },
        'strict-caps': {
          default: false,
          description:
            'Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device',
          title: 'strict-caps config',
          type: 'boolean',
        },
        tmp: {
          description:
            'Absolute path to directory Appium can use to manage temp files. Defaults to C:\\Windows\\Temp on Windows and /tmp otherwise.',
          title: 'tmp config',
          type: 'string',
        },
        'trace-dir': {
          description:
            'Absolute path to directory Appium can use to save iOS instrument traces; defaults to <tmp>/appium-instruments',
          title: 'trace-dir config',
          type: 'string',
        },
        'use-drivers': {
          description:
            'A list of drivers to activate. By default, all installed drivers will be activated.',
          appiumCliDescription:
            'A list of drivers to activate. Can be a comma-delimited string or path to CSV file. By default, all installed drivers will be activated.',
          items: {
            type: 'string',
          },
          title: 'use-drivers config',
          type: 'array',
          uniqueItems: true,
        },
        'use-plugins': {
          description:
            'A list of plugins to activate. To activate all plugins, the value should be an array with a single item "all".',
          appiumCliDescription:
            'A list of plugins to activate. Can be a comma-delimited string, path to CSV file, or the string "all" to use all installed plugins.',
          items: {
            type: 'string',
          },
          title: 'use-plugins config',
          type: 'array',
          uniqueItems: true,
        },
        webhook: {
          $comment:
            'This should probably use a uri-template format to restrict the protocol to http/https',
          appiumCliAliases: ['G'],
          description: 'Also send log output to this http listener',
          format: 'uri',
          title: 'webhook config',
          type: 'string',
        },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};
