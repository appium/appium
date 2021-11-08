module.exports = {
  server: {
    address: '127.0.0.1',
    'allow-cors': true,
    'allow-insecure': ['foo', 'bar'],
    'base-path': '/',
    'callback-address': '127.0.0.1',
    'callback-port': 4723,
    'debug-log-spacing': true,
    'default-capabilities': {
      key: 'value',
    },
    'deny-insecure': ['baz', 'quux'],
    driver: {
      xcuitest: {
        key: 'value',
      },
    },
    'keep-alive-timeout': 600,
    'local-timezone': true,
    log: '/tmp/appium.log',
    'log-level': 'info',
    'log-no-colors': false,
    'log-timestamp': true,
    'long-stacktrace': false,
    'no-perms-check': false,
    nodeconfig: {
      key: 'value',
    },
    plugin: {
      images: {
        key: 'value',
      },
    },
    port: 4723,
    'relaxed-security': false,
    'session-override': false,
    'strict-caps': true,
    tmp: '/tmp',
    'trace-dir': '/tmp/appium-instruments',
    'use-drivers': ['foo', 'bar'],
    'use-plugins': ['baz', 'quux'],
    webhook: 'https://some-url.com',
  },
};
