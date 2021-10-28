module.exports = {
  server: {
    address: '0.0.0.0',
    'allow-cors': false,
    'allow-insecure': [],
    'base-path': '/',
    'callback-address': '0.0.0.0',
    'callback-port': 31337,
    'debug-log-spacing': false,
    'default-capabilities': {},
    'deny-insecure': [],
    'keep-alive-timeout': 600,
    'local-timezone': false,
    log: '/tmp/appium.log',
    'log-level': 'info',
    'log-no-colors': false,
    'log-timestamp': false,
    'long-stacktrace': false,
    'no-perms-check': false,
    nodeconfig: {
      foo: 'bar'
    },
    port: 31337,
    'relaxed-security': false,
    'session-override': false,
    'strict-caps': false,
    tmp: '/tmp',
    'trace-dir': '/tmp/appium-instruments',
    'use-drivers': [],
    'use-plugins': ['all'],
    webhook: 'http://0.0.0.0/hook'
  },
};
