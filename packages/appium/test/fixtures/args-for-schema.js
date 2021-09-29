export default [
  [
    ['--address', '-a'],
    {dest: 'foo', help: 'IP address to listen on', required: false},
  ],
  [
    ['--allow-cors'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Whether the Appium server should allow web browser connections from any host',
      required: false,
    },
  ],
  [
    ['--allow-insecure'],
    {
      dest: 'foo',
      help: 'Set which insecure features are allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Note that features defined via "deny-insecure" will be disabled, even if also listed here. If string, a path to a text file containing policy or a comma-delimited list.',
      required: false,
    },
  ],
  [
    ['--base-path', '-pa'],
    {
      dest: 'foo',
      help: 'Base path to use as the prefix for all webdriver routes running on the server',
      required: false,
    },
  ],
  [
    ['--callback-address', '-ca'],
    {
      dest: 'foo',
      help: 'Callback IP address (default: same as "address")',
      required: false,
    },
  ],
  [
    ['--callback-port', '-cp'],
    {
      dest: 'foo',
      help: 'Callback port (default: same as "port")',
      required: false,
      type: 'int',
    },
  ],
  [
    ['--debug-log-spacing'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Add exaggerated spacing in logs to help with visual inspection',
      required: false,
    },
  ],
  [
    ['--default-capabilities', '-dc'],
    {
      dest: 'foo',
      help: 'Set the default desired capabilities, which will be set on each session unless overridden by received capabilities. If a string, a path to a JSON file containing the capabilities, or raw JSON.',
      required: false,
    },
  ],
  [
    ['--deny-insecure'],
    {
      dest: 'foo',
      help: 'Set which insecure features are not allowed to run in this server\'s sessions. Features are defined on a driver level; see documentation for more details. Features listed here will not be enabled even if also listed in "allow-insecure", and even if "relaxed-security" is enabled. If string, a path to a text file containing policy or a comma-delimited list.',
      required: false,
    },
  ],
  [
    ['--drivers'],
    {
      dest: 'foo',
      help: 'A list of drivers to activate. By default, all installed drivers will be activated.  If a string, must be valid JSON',
      required: false,
    },
  ],
  [
    ['--keep-alive-timeout', '-ka'],
    {
      dest: 'foo',
      help: 'Number of seconds the Appium server should apply as both the keep-alive timeout and the connection timeout for all requests. A value of 0 disables the timeout.',
      required: false,
      type: 'int',
    },
  ],
  [
    ['--local-timezone'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Use local timezone for timestamps',
      required: false,
    },
  ],
  [
    ['--log-file', '-g'],
    {
      dest: 'logFile',
      help: 'Also send log output to this file',
      required: false,
    },
  ],
  [
    ['--log-filters'],
    {dest: 'foo', help: 'One or more log filtering rules', required: false},
  ],
  [
    ['--log-no-colors'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Do not use color in console output',
      required: false,
    },
  ],
  [
    ['--log-timestamp'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Show timestamps in console output',
      required: false,
    },
  ],
  [
    ['--loglevel'],
    {
      choices: [
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
      dest: 'loglevel',
      help: 'Log level (console[:file])',
      required: false,
    },
  ],
  [
    ['--long-stacktrace'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Add long stack traces to log entries. Recommended for debugging only.',
      required: false,
    },
  ],
  [
    ['--no-perms-check'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Do not check that needed files are readable and/or writable',
      required: false,
    },
  ],
  [
    ['--nodeconfig'],
    {
      dest: 'foo',
      help: 'Path to configuration JSON file to register Appium as a node with Selenium Grid 3; otherwise the configuration itself',
      required: false,
    },
  ],
  [
    ['--plugins'],
    {
      dest: 'foo',
      help: 'A list of plugins to activate. To activate all plugins, use the single string "all". If a string, can otherwise be valid JSON.',
      required: false,
    },
  ],
  [
    ['--port', '-p'],
    {dest: 'foo', help: 'Port to listen on', required: false, type: 'int'},
  ],
  [
    ['--relaxed-security'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Disable additional security checks, so it is possible to use some advanced features, provided by drivers supporting this option. Only enable it if all the clients are in the trusted network and it\'s not the case if a client could potentially break out of the session sandbox. Specific features can be overridden by using "deny-insecure"',
      required: false,
    },
  ],
  [
    ['--session-override'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Enables session override (clobbering)',
      required: false,
    },
  ],
  [
    ['--strict-caps'],
    {
      action: 'store_true',
      dest: 'foo',
      help: 'Cause sessions to fail if desired caps are sent in that Appium does not recognize as valid for the selected device',
      required: false,
    },
  ],
  [
    ['--tmp'],
    {
      dest: 'foo',
      help: 'Absolute path to directory Appium can use to manage temp files. Defaults to C:\\Windows\\Temp on Windows and /tmp otherwise.',
      required: false,
    },
  ],
  [
    ['--trace-dir'],
    {
      dest: 'foo',
      help: 'Absolute path to directory Appium can use to save iOS instrument traces; defaults to <tmp>/appium-instruments',
      required: false,
    },
  ],
  [
    ['--webhook', '-G'],
    {
      dest: 'foo',
      help: 'Also send log output to this http listener',
      required: false,
    },
  ],
];
