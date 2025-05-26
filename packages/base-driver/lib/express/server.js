import _ from 'lodash';
import path from 'path';
import express from 'express';
import http from 'http';
import favicon from 'serve-favicon';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import log from './logger';
import {startLogFormatter, endLogFormatter} from './express-logging';
import {
  allowCrossDomain,
  fixPythonContentType,
  defaultToJSONContentType,
  catchAllHandler,
  allowCrossDomainAsyncExecute,
  handleIdempotency,
  handleUpgrade,
  catch404Handler,
  handleLogContext,
} from './middleware';
import {guineaPig, guineaPigScrollable, guineaPigAppBanner, welcome, STATIC_DIR} from './static';
import {produceError, produceCrash} from './crash';
import {
  addWebSocketHandler,
  removeWebSocketHandler,
  removeAllWebSocketHandlers,
  getWebSocketHandlers,
} from './websocket';
import B from 'bluebird';
import {DEFAULT_BASE_PATH} from '../constants';
import {fs, timing} from '@appium/support';

const KEEP_ALIVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 *
 * @param {import('express').Express} app
 * @param {Partial<import('@appium/types').ServerArgs>} [cliArgs]
 * @returns {Promise<http.Server>}
 */
async function createServer (app, cliArgs) {
  const {sslCertificatePath, sslKeyPath} = cliArgs ?? {};
  if (!sslCertificatePath && !sslKeyPath) {
    return http.createServer(app);
  }
  if (!sslCertificatePath || !sslKeyPath) {
    throw new Error(`Both certificate path and key path must be provided to enable TLS`);
  }

  const certKey = [sslCertificatePath, sslKeyPath];
  const zipped = _.zip(
    await B.all(certKey.map((p) => fs.exists(p))),
    ['certificate', 'key'],
    certKey,
  );
  for (const [exists, desc, p] of zipped) {
    if (!exists) {
      throw new Error(`The provided SSL ${desc} at '${p}' does not exist or is not accessible`);
    }
  }
  const [cert, key] = await B.all(certKey.map((p) => fs.readFile(p, 'utf8')));
  log.debug('Enabling TLS/SPDY on the server using the provided certificate');

  return require('spdy').createServer({
    cert,
    key,
    spdy: {
      plain: false,
      ssl: true,
    }
  }, app);
}

/**
 *
 * @param {ServerOpts} opts
 * @returns {Promise<AppiumServer>}
 */
export async function server(opts) {
  const {
    routeConfiguringFunction,
    port,
    hostname,
    cliArgs = /** @type {import('@appium/types').ServerArgs} */ ({}),
    allowCors = true,
    basePath = DEFAULT_BASE_PATH,
    extraMethodMap = {},
    serverUpdaters = [],
    keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS,
    requestTimeout,
  } = opts;

  const app = express();
  const httpServer = await createServer(app, cliArgs);

  return await new B(async (resolve, reject) => {
    // we put an async function as the promise constructor because we want some things to happen in
    // serial (application of plugin updates, for example). But we still need to use a promise here
    // because some elements of server start failure only happen in httpServer listeners. So the
    // way we resolve it is to use an async function here but to wrap all the inner logic in
    // try/catch so any errors can be passed to reject.
    try {
      const appiumServer = configureHttp({
        httpServer,
        reject,
        keepAliveTimeout,
        gracefulShutdownTimeout: cliArgs.shutdownTimeout,
      });
      configureServer({
        app,
        addRoutes: routeConfiguringFunction,
        allowCors,
        basePath,
        extraMethodMap,
        webSocketsMapping: appiumServer.webSocketsMapping,
      });
      // allow extensions to update the app and http server objects
      for (const updater of serverUpdaters) {
        await updater(app, appiumServer, cliArgs);
      }

      // once all configurations and updaters have been applied, make sure to set up a catchall
      // handler so that anything unknown 404s. But do this after everything else since we don't
      // want to block extensions' ability to add routes if they want.
      app.all('*', catch404Handler);

      await startServer({
        httpServer,
        hostname,
        port,
        keepAliveTimeout,
        requestTimeout,
      });

      resolve(appiumServer);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Sets up some Express middleware and stuff
 * @param {ConfigureServerOpts} opts
 */
export function configureServer({
  app,
  addRoutes,
  allowCors = true,
  basePath = DEFAULT_BASE_PATH,
  extraMethodMap = {},
  webSocketsMapping = {},
}) {
  basePath = normalizeBasePath(basePath);

  app.use(endLogFormatter);
  app.use(handleLogContext);

  // set up static assets
  app.use(favicon(path.resolve(STATIC_DIR, 'favicon.ico')));
  // eslint-disable-next-line import/no-named-as-default-member
  app.use(express.static(STATIC_DIR));

  // crash routes, for testing
  app.use(`${basePath}/produce_error`, produceError);
  app.use(`${basePath}/crash`, produceCrash);

  app.use(handleUpgrade(webSocketsMapping));
  if (allowCors) {
    app.use(allowCrossDomain);
  } else {
    app.use(allowCrossDomainAsyncExecute(basePath));
  }
  app.use(handleIdempotency);
  app.use(fixPythonContentType(basePath));
  app.use(defaultToJSONContentType);
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride());
  app.use(catchAllHandler);

  // make sure appium never fails because of a file size upload limit
  app.use(bodyParser.json({limit: '1gb'}));

  // set up start logging (which depends on bodyParser doing its thing)
  app.use(startLogFormatter);

  addRoutes(app, {basePath, extraMethodMap});

  // dynamic routes for testing, etc.
  app.all('/welcome', welcome);
  app.all('/test/guinea-pig', guineaPig);
  app.all('/test/guinea-pig-scrollable', guineaPigScrollable);
  app.all('/test/guinea-pig-app-banner', guineaPigAppBanner);
}

/**
 * Monkeypatches the `http.Server` instance and returns a {@linkcode AppiumServer}.
 * This function _mutates_ the `httpServer` parameter.
 * @param {ConfigureHttpOpts} opts
 * @returns {AppiumServer}
 */
function configureHttp({httpServer, reject, keepAliveTimeout, gracefulShutdownTimeout}) {
  /**
   * @type {AppiumServer}
   */
  const appiumServer = /** @type {any} */ (httpServer);
  appiumServer.webSocketsMapping = {};
  appiumServer.addWebSocketHandler = addWebSocketHandler;
  appiumServer.removeWebSocketHandler = removeWebSocketHandler;
  appiumServer.removeAllWebSocketHandlers = removeAllWebSocketHandlers;
  appiumServer.getWebSocketHandlers = getWebSocketHandlers;
  appiumServer.isSecure = function isSecure() {
    // eslint-disable-next-line dot-notation
    return Boolean(this['_spdyState']?.secure);
  };

  // http.Server.close() only stops new connections, but we need to wait until
  // all connections are closed and the `close` event is emitted
  const originalClose = appiumServer.close.bind(appiumServer);
  appiumServer.close = async () =>
    await new B((_resolve, _reject) => {
      log.info('Closing Appium HTTP server');
      const timer = new timing.Timer().start();
      const onTimeout = setTimeout(() => {
        if (gracefulShutdownTimeout > 0) {
          log.info(
            `Not all active connections have been closed within ${gracefulShutdownTimeout}ms. ` +
            `This timeout might be customized by the --shutdown-timeout command line ` +
            `argument. Closing the server anyway.`
          );
        }
        process.exit(process.exitCode ?? 0);
      }, gracefulShutdownTimeout);
      httpServer.once('close', () => {
        log.info(
          `Appium HTTP server has been successfully closed after ` +
          `${timer.getDuration().asMilliSeconds.toFixed(0)}ms`
        );
        clearTimeout(onTimeout);
        _resolve();
      });
      originalClose((/** @type {Error|undefined} */ err) => {
        if (err) {
          _reject(err);
        }
      });
    });

  appiumServer.once(
    'error',
    /** @param {NodeJS.ErrnoException} err */ (err) => {
      if (err.code === 'EADDRNOTAVAIL') {
        log.error(
          'Could not start REST http interface listener. ' + 'Requested address is not available.'
        );
      } else {
        log.error(
          'Could not start REST http interface listener. The requested ' +
            'port may already be in use. Please make sure there is no ' +
            'other instance of this server running already.'
        );
      }
      reject(err);
    }
  );

  appiumServer.on('connection', (socket) => socket.setTimeout(keepAliveTimeout));

  return appiumServer;
}

/**
 * Starts an {@linkcode AppiumServer}
 * @param {StartServerOpts} opts
 * @returns {Promise<void>}
 */
async function startServer({
  httpServer,
  port,
  hostname,
  keepAliveTimeout,
  requestTimeout,
}) {
  // If the hostname is omitted, the server will accept
  // connections on any IP address
  /** @type {(port: number, hostname?: string) => B<http.Server>} */
  const start = B.promisify(httpServer.listen, {context: httpServer});
  const startPromise = start(port, hostname);
  httpServer.keepAliveTimeout = keepAliveTimeout;
  if (_.isInteger(requestTimeout)) {
    httpServer.requestTimeout = Number(requestTimeout);
  }
  // headers timeout must be greater than keepAliveTimeout
  httpServer.headersTimeout = keepAliveTimeout + 5 * 1000;
  await startPromise;
}

/**
 * Normalize base path string
 * @param {string} basePath
 * @returns {string}
 */
export function normalizeBasePath(basePath) {
  if (!_.isString(basePath)) {
    throw new Error(`Invalid path prefix ${basePath}`);
  }

  // ensure the path prefix does not end in '/', since our method map
  // starts all paths with '/'
  basePath = basePath.replace(/\/$/, '');

  // likewise, ensure the path prefix does always START with /, unless the path
  // is empty meaning no base path at all
  if (basePath !== '' && !basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }

  return basePath;
}


/**
 * Options for {@linkcode startServer}.
 * @typedef StartServerOpts
 * @property {import('http').Server} httpServer - HTTP server instance
 * @property {number} port - Port to run on
 * @property {number} keepAliveTimeout - Keep-alive timeout in milliseconds
 * @property {string} [hostname] - Optional hostname
 * @property {number} [requestTimeout] - The timeout value in milliseconds for
 * receiving the entire request from the client
 */

/**
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 */

/**
 * @typedef {import('@appium/types').MethodMap<import('@appium/types').ExternalDriver>} MethodMap
 */

/**
 * Options for {@linkcode configureHttp}
 * @typedef ConfigureHttpOpts
 * @property {import('http').Server} httpServer - HTTP server instance
 * @property {(error?: any) => void} reject - Rejection function from `Promise` constructor
 * @property {number} keepAliveTimeout - Keep-alive timeout in milliseconds
 * @property {number} gracefulShutdownTimeout - For how long the server should delay its
 * shutdown before force-closing all open connections to it. Providing zero will force-close
 * the server without waiting for any connections.
 */

/**
 * Options for {@linkcode server}
 * @typedef ServerOpts
 * @property {RouteConfiguringFunction} routeConfiguringFunction
 * @property {number} port
 * @property {import('@appium/types').ServerArgs} [cliArgs]
 * @property {string} [hostname]
 * @property {boolean} [allowCors]
 * @property {string} [basePath]
 * @property {MethodMap} [extraMethodMap]
 * @property {import('@appium/types').UpdateServerCallback[]} [serverUpdaters]
 * @property {number} [keepAliveTimeout]
 * @property {number} [requestTimeout]
 */

/**
 * A function which configures routes
 * @callback RouteConfiguringFunction
 * @param {import('express').Express} app
 * @param {RouteConfiguringFunctionOpts} [opts]
 * @returns {void}
 */

/**
 * Options for a {@linkcode RouteConfiguringFunction}
 * @typedef RouteConfiguringFunctionOpts
 * @property {string} [basePath]
 * @property {MethodMap} [extraMethodMap]
 */

/**
 * Options for {@linkcode configureServer}
 * @typedef ConfigureServerOpts
 * @property {import('express').Express} app
 * @property {RouteConfiguringFunction} addRoutes
 * @property {boolean} [allowCors]
 * @property {string} [basePath]
 * @property {MethodMap} [extraMethodMap]
 * @property {import('@appium/types').StringRecord} [webSocketsMapping={}]
 */
