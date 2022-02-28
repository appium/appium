// @ts-check

const schema = /** @type {const} */ ({
  $schema: 'http://json-schema.org/draft-07/schema',
  additionalProperties: false,
  description: 'A schema for Appium configuration files',
  properties: {
    server: {
      additionalProperties: false,
      description: 'Configuration when running Appium as a server',
      properties: {
        address: {
          $comment:
            'I think hostname covers both DNS and IPv4...could be wrong',
          appiumCliAliases: ['a'],
          default: '0.0.0.0',
          description: 'IP address to listen on',
          format: 'hostname',
          title: 'Server Address',
          type: 'string',
        },
        'allow-cors': {
          description:
            'Whether the Appium server should allow web browser connections from any host',
          title: 'Allow CORS',
          type: 'boolean',
          default: false,
        },
        'allow-insecure': {
          appiumCliTransformer: 'csv',
          default: [],
          description:
            'Set which insecure features are allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Note that features defined via "deny-insecure" will be disabled, even if also listed here. If string, a path to a text file containing policy or a comma-delimited list.',
          items: {
            type: 'string',
          },
          title: 'Allow Insecure Features',
          type: 'array',
          uniqueItems: true,
        },
        'base-path': {
          appiumCliAliases: ['pa'],
          default: '',
          description:
            'Base path to use as the prefix for all webdriver routes running on the server',
          title: 'Base Path for Webdriver Routes',
          type: 'string',
        },
        'callback-address': {
          appiumCliAliases: ['ca'],
          description: 'Callback IP address (default: same as "address")',
          title: 'Callback Server Address',
          type: 'string',
        },
        'callback-port': {
          appiumCliAliases: ['cp'],
          default: 4723,
          description: 'Callback port (default: same as "port")',
          maximum: 65535,
          minimum: 1,
          title: 'Callback Server Port',
          type: 'integer',
        },
        'debug-log-spacing': {
          default: false,
          description:
            'Add exaggerated spacing in logs to help with visual inspection',
          title: 'Enable "Debug" Log Spacing',
          type: 'boolean',
        },
        'default-capabilities': {
          $comment: 'TODO',
          appiumCliAliases: ['dc'],
          description:
            'Set the default desired capabilities, which will be set on each session unless overridden by received capabilities. If a string, a path to a JSON file containing the capabilities, or raw JSON.',
          title: 'Default Capabilities',
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
          title: 'Deny Insecure Features',
          type: 'array',
          uniqueItems: true,
        },
        driver: {
          description:
            'Driver-specific configuration. Keys should correspond to driver package names',
          properties: {},
          title: 'Driver-Specific Config',
          type: 'object',
        },
        'keep-alive-timeout': {
          appiumCliAliases: ['ka'],
          default: 600,
          description:
            'Number of seconds the Appium server should apply as both the keep-alive timeout and the connection timeout for all requests. A value of 0 disables the timeout.',
          minimum: 0,
          title: 'Keep-Alive Timeout',
          type: 'integer',
        },
        'local-timezone': {
          default: false,
          description: 'Use local timezone for timestamps',
          title: 'Local Timezone',
          type: 'boolean',
        },
        log: {
          appiumCliAliases: ['g'],
          appiumCliDest: 'logFile',
          description: 'Also send log output to this file',
          title: 'Logfile Path',
          type: 'string',
        },
        'log-filters': {
          $comment: 'TODO',
          description: 'One or more log filtering rules',
          items: {
            type: 'string',
          },
          title: 'Log Filtering Rules',
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
          title: 'Log Level',
          type: 'string',
        },
        'log-no-colors': {
          default: false,
          description: 'Do not use color in console output',
          title: 'Suppress Log Color',
          type: 'boolean',
        },
        'log-timestamp': {
          default: false,
          description: 'Show timestamps in console output',
          title: 'Log Timestamps',
          type: 'boolean',
        },
        'long-stacktrace': {
          default: false,
          description:
            'Add long stack traces to log entries. Recommended for debugging only.',
          title: 'Show Long Stacktraces',
          type: 'boolean',
        },
        'no-perms-check': {
          default: false,
          description:
            'Do not check that needed files are readable and/or writable',
          title: 'Disable Permission Checks',
          type: 'boolean',
        },
        nodeconfig: {
          $comment:
            'Selenium Grid 3 is unmaintained and Selenium Grid 4 no longer supports this file.',
          description:
            'Path to configuration JSON file to register Appium as a node with Selenium Grid 3; otherwise the configuration itself',
          title: 'Node Config File Path',
          type: 'object',
        },
        plugin: {
          description:
            'Plugin-specific configuration. Keys should correspond to plugin package names',
          properties: {},
          title: 'Plugin-Specific Config',
          type: 'object',
        },
        port: {
          appiumCliAliases: ['p'],
          default: 4723,
          description: 'Port to listen on',
          maximum: 65535,
          minimum: 1,
          title: 'Server Port',
          type: 'integer',
        },
        'relaxed-security': {
          default: false,
          description:
            'Disable additional security checks, so it is possible to use some advanced features, provided by drivers supporting this option. Only enable it if all the clients are in the trusted network and it\'s not the case if a client could potentially break out of the session sandbox. Specific features can be overridden by using "deny-insecure"',
          title: 'Enable Relaxed Security',
          type: 'boolean',
          appiumCliDest: 'relaxedSecurityEnabled'
        },
        'session-override': {
          default: false,
          description: 'Enables session override (clobbering)',
          title: 'Allow Session Override',
          type: 'boolean',
        },
        'strict-caps': {
          default: false,
          description:
            'Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device',
          title: 'Strict Caps Mode',
          type: 'boolean',
        },
        tmp: {
          appiumCliDest: 'tmpDir',
          description:
            'Absolute path to directory Appium can use to manage temp files. Defaults to C:\\Windows\\Temp on Windows and /tmp otherwise.',
          title: 'Override Temp Path',
          type: 'string',
        },
        'trace-dir': {
          description:
            'Absolute path to directory Appium can use to save iOS instrument traces; defaults to <tmp>/appium-instruments',
          title: 'Trace Directory',
          type: 'string',
        },
        'use-drivers': {
          appiumCliDescription:
            'A list of drivers to activate. Can be a comma-delimited string or path to CSV file. By default, all installed drivers will be activated.',
          default: [],
          description:
            'A list of drivers to activate. By default, all installed drivers will be activated.',
          items: {
            type: 'string',
          },
          title: 'Enabled Drivers',
          type: 'array',
          uniqueItems: true,
        },
        'use-plugins': {
          appiumCliDescription:
            'A list of plugins to activate. Can be a comma-delimited string, path to CSV file, or the string "all" to use all installed plugins.',
          default: [],
          description:
            'A list of plugins to activate. To activate all plugins, the value should be an array with a single item "all".',
          items: {
            type: 'string',
          },
          title: 'Enabled Plugins',
          type: 'array',
          uniqueItems: true,
        },
        webhook: {
          $comment:
            'This should probably use a uri-template format to restrict the protocol to http/https',
          appiumCliAliases: ['G'],
          description: 'Also send log output to this http listener',
          format: 'uri',
          title: 'Webhook URL',
          type: 'string',
        },
      },
      title: 'Server Configuration',
      type: 'object',
    },
  },
  title: 'Appium Configuration',
  type: 'object',
});

export default schema;
