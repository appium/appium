import _ from 'lodash';
import path from 'path';
import express from 'express';
import http from 'http';
import favicon from 'serve-favicon';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import log from './logger';
import { startLogFormatter, endLogFormatter } from './express-logging';
import {
  allowCrossDomain, fixPythonContentType, defaultToJSONContentType,
  catchAllHandler, allowCrossDomainAsyncExecute, handleIdempotency,
  catch404Handler,
} from './middleware';
import { guineaPig, guineaPigScrollable, guineaPigAppBanner, welcome, STATIC_DIR } from './static';
import { produceError, produceCrash } from './crash';
import {
  addWebSocketHandler, removeWebSocketHandler, removeAllWebSocketHandlers,
  getWebSocketHandlers
} from './websocket';
import B from 'bluebird';
import { DEFAULT_BASE_PATH } from '../constants';
import { EventEmitter } from 'events';


const KEEP_ALIVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes


async function server (opts = {}) {
  const {
    routeConfiguringFunction,
    port,
    hostname = null,
    allowCors = true,
    basePath = DEFAULT_BASE_PATH,
    plugins = [],
    keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS,
  } = opts;

  // create the actual http server
  const app = express();
  const httpServer = http.createServer(app);
  return await new B(async (resolve, reject) => {
    // we put an async function as the promise constructor because we want some things to happen in
    // serial (application of plugin updates, for example). But we still need to use a promise here
    // because some elements of server start failure only happen in httpServer listeners. So the
    // way we resolve it is to use an async function here but to wrap all the inner logic in
    // try/catch so any errors can be passed to reject.
    try {
      configureHttp({httpServer, reject, keepAliveTimeout});
      configureServer({app, addRoutes: routeConfiguringFunction, allowCors, basePath, plugins});
      await configureServerPlugins({app, httpServer, plugins});

      // once all configurations and plugins have been applied, make sure to set up a catchall
      // handler so that anything unknown 404s. But do this after everything else since we don't
      // want to block plugins' ability to add routes if they want.
      app.all('*', catch404Handler);

      await startServer({httpServer, hostname, port, keepAliveTimeout});
      resolve(httpServer);
    } catch (err) {
      reject(err);
    }
  });

}

function configureServer ({
  app,
  addRoutes,
  allowCors = true,
  basePath = DEFAULT_BASE_PATH,
  plugins = [],
}) {
  basePath = normalizeBasePath(basePath);

  app.use(endLogFormatter);

  // set up static assets
  app.use(favicon(path.resolve(STATIC_DIR, 'favicon.ico')));
  app.use(express.static(STATIC_DIR));

  // crash routes, for testing
  app.use(`${basePath}/produce_error`, produceError);
  app.use(`${basePath}/crash`, produceCrash);

  // add middlewares
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

  const extraMethods = plugins.filter((p) => {
    if (!_.isPlainObject(p.newMethodMap)) {
      log.warn(`Tried to apply newMethodMap from plugin '${p.name}' but it was invalid. Will ` +
               `skip adding these methods to the method map.`);
      return false;
    }
    return true;
  }).map((p) => p.newMethodMap);
  addRoutes(app, {basePath, extraMethods});

  // dynamic routes for testing, etc.
  app.all('/welcome', welcome);
  app.all('/test/guinea-pig', guineaPig);
  app.all('/test/guinea-pig-scrollable', guineaPigScrollable);
  app.all('/test/guinea-pig-app-banner', guineaPigAppBanner);
}

function configureHttp ({httpServer, reject, keepAliveTimeout}) {
  const serverState = {
    notifier: new EventEmitter(),
    closed: false,
  };
  httpServer.addWebSocketHandler = addWebSocketHandler;
  httpServer.removeWebSocketHandler = removeWebSocketHandler;
  httpServer.removeAllWebSocketHandlers = removeAllWebSocketHandlers;
  httpServer.getWebSocketHandlers = getWebSocketHandlers;

  // http.Server.close() only stops new connections, but we need to wait until
  // all connections are closed and the `close` event is emitted
  const close = httpServer.close.bind(httpServer);
  httpServer.close = async () => await new B((resolve, reject) => {
    // https://github.com/nodejs/node-v0.x-archive/issues/9066#issuecomment-124210576
    serverState.closed = true;
    serverState.notifier.emit('shutdown');
    log.info('Waiting until the server is closed');
    httpServer.on('close', () => {
      log.info('Received server close event');
      resolve();
    });
    close((err) => {
      if (err) reject(err); // eslint-disable-line curly
    });
  });

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRNOTAVAIL') {
      log.error('Could not start REST http interface listener. ' +
                'Requested address is not available.');
    } else {
      log.error('Could not start REST http interface listener. The requested ' +
                'port may already be in use. Please make sure there is no ' +
                'other instance of this server running already.');
    }
    reject(err);
  });

  httpServer.on('connection', (socket) => {
    socket.setTimeout(keepAliveTimeout);
    socket.on('error', reject);

    function destroy () {
      socket.destroy();
    }
    socket._openReqCount = 0;
    socket.once('close', () => serverState.notifier.removeListener('shutdown', destroy));
    serverState.notifier.once('shutdown', destroy);
  });

  httpServer.on('request', function (req, res) {
    const socket = req.connection || req.socket;
    socket._openReqCount++;
    res.on('finish', function () {
      socket._openReqCount--;
      if (serverState.closed && socket._openReqCount === 0) {
        socket.destroy();
      }
    });
  });
}

async function configureServerPlugins ({plugins, app, httpServer}) {
  // allow plugins to update the app and http server objects
  for (const plugin of plugins.filter((p) => p.updatesServer)) {
    log.info(`Allowing plugin ${plugin.name} to modify the Appium server`);
    try {
      // wrap this in error handling in case the plugin forgot to mark the function async or
      // forgot to implement it
      await plugin.updateServer(app, httpServer);
    } catch (err) {
      log.error(`Plugin '${plugin.name}' tried to update the server but the updateServer ` +
                `method was not implemented, did not return a promise, or threw an ` +
                `error. Original message: ${err}.`);
      throw err;
    }
  }
}

async function startServer ({httpServer, port, hostname, keepAliveTimeout}) {
  const serverArgs = [port];
  if (hostname) {
    // If the hostname is omitted, the server will accept
    // connections on any IP address
    serverArgs.push(hostname);
  }
  const startPromise = B.promisify(httpServer.listen, {context: httpServer})(...serverArgs);
  httpServer.keepAliveTimeout = keepAliveTimeout;
  // headers timeout must be greater than keepAliveTimeout
  httpServer.headersTimeout = keepAliveTimeout + 5 * 1000;
  await startPromise;
}

function normalizeBasePath (basePath) {
  if (!_.isString(basePath)) {
    throw new Error(`Invalid path prefix ${basePath}`);
  }

  // ensure the path prefix does not end in '/', since our method map
  // starts all paths with '/'
  basePath = basePath.replace(/\/$/, '');

  // likewise, ensure the path prefix does always START with /, unless the path
  // is empty meaning no base path at all
  if (basePath !== '' && basePath[0] !== '/') {
    basePath = `/${basePath}`;
  }

  return basePath;
}

export { server, configureServer, normalizeBasePath };
