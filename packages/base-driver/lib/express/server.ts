import _ from 'lodash';
import path from 'node:path';
import express from 'express';
import type {Express} from 'express';
import http from 'node:http';
import type {Server as HttpServer} from 'node:http';
import favicon from 'serve-favicon';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import log from './logger';
import {startLogFormatter, endLogFormatter} from './express-logging';
import {
  allowCrossDomain,
  defaultToJSONContentType,
  catchAllHandler,
  allowCrossDomainAsyncExecute,
  handleIdempotency,
  handleUpgrade,
  tryHandleWebSocketUpgrade,
  catch404Handler,
  handleLogContext,
} from './middleware';
import {
  guineaPig,
  guineaPigScrollable,
  guineaPigAppBanner,
  welcome,
  STATIC_DIR,
} from './static';
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
import type {
  AppiumServer,
  ServerArgs,
  UpdateServerCallback,
  MethodMap,
  ExternalDriver,
  StringRecord,
} from '@appium/types';

const KEEP_ALIVE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/** Options for {@linkcode RouteConfiguringFunction} */
export interface RouteConfiguringFunctionOpts {
  basePath?: string;
  extraMethodMap?: MethodMap<ExternalDriver>;
}

/** A function which configures routes */
export type RouteConfiguringFunction = (
  app: Express,
  opts?: RouteConfiguringFunctionOpts
) => void;

/** Options for {@linkcode server} */
export interface ServerOpts {
  routeConfiguringFunction: RouteConfiguringFunction;
  port: number;
  cliArgs?: Partial<ServerArgs>;
  hostname?: string;
  allowCors?: boolean;
  basePath?: string;
  extraMethodMap?: MethodMap<ExternalDriver>;
  serverUpdaters?: UpdateServerCallback[];
  keepAliveTimeout?: number;
  requestTimeout?: number;
}

/** Options for {@linkcode configureServer} */
export interface ConfigureServerOpts {
  app: Express;
  addRoutes: RouteConfiguringFunction;
  allowCors?: boolean;
  basePath?: string;
  extraMethodMap?: MethodMap<ExternalDriver>;
  webSocketsMapping?: StringRecord;
  useLegacyUpgradeHandler?: boolean;
}

/** Options for {@linkcode configureHttp} */
export interface ConfigureHttpOpts {
  httpServer: HttpServer;
  reject: (error?: unknown) => void;
  keepAliveTimeout: number;
  gracefulShutdownTimeout?: number;
}

/** Options for {@linkcode startServer} */
export interface StartServerOpts {
  httpServer: HttpServer;
  port: number;
  hostname?: string;
  keepAliveTimeout: number;
  requestTimeout?: number;
}

/**
 * @param opts - Server options
 * @returns Promise resolving to the Appium server instance
 */
export async function server(opts: ServerOpts): Promise<AppiumServer> {
  const {
    routeConfiguringFunction,
    port,
    hostname,
    cliArgs = {},
    allowCors = true,
    basePath = DEFAULT_BASE_PATH,
    extraMethodMap = {},
    serverUpdaters = [],
    keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS,
    requestTimeout,
  } = opts;

  const app = express();
  const httpServer = await createServer(app, cliArgs);

  return await new B<AppiumServer>(async (resolve, reject) => {
    try {
      const appiumServer = configureHttp({
        httpServer,
        reject,
        keepAliveTimeout,
        gracefulShutdownTimeout: cliArgs.shutdownTimeout,
      });
      const useLegacyUpgradeHandler = !hasShouldUpgradeCallback(httpServer);
      configureServer({
        app,
        addRoutes: routeConfiguringFunction,
        allowCors,
        basePath,
        extraMethodMap,
        webSocketsMapping: appiumServer.webSocketsMapping,
        useLegacyUpgradeHandler,
      });
      for (const updater of serverUpdaters) {
        await updater(app, appiumServer, cliArgs);
      }

      app.all('/*all', catch404Handler);

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
 * Sets up Express middleware and routes.
 *
 * @param opts - Configuration options
 */
export function configureServer({
  app,
  addRoutes,
  allowCors = true,
  basePath = DEFAULT_BASE_PATH,
  extraMethodMap = {},
  webSocketsMapping = {},
  useLegacyUpgradeHandler = true,
}: ConfigureServerOpts): void {
  basePath = normalizeBasePath(basePath);

  app.use(endLogFormatter);
  app.use(handleLogContext);

  app.use(favicon(path.resolve(STATIC_DIR, 'favicon.ico')));
  app.use(express.static(STATIC_DIR));

  app.use(`${basePath}/produce_error`, produceError);
  app.use(`${basePath}/crash`, produceCrash);

  if (useLegacyUpgradeHandler) {
    app.use(handleUpgrade(webSocketsMapping));
  }
  if (allowCors) {
    app.use(allowCrossDomain);
  } else {
    app.use(allowCrossDomainAsyncExecute(basePath));
  }
  app.use(handleIdempotency);
  app.use(defaultToJSONContentType);
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride());
  app.use(catchAllHandler);

  app.use(bodyParser.json({limit: '1gb'}));

  app.use(startLogFormatter);

  addRoutes(app, {basePath, extraMethodMap});

  app.all('/welcome', welcome);
  app.all('/test/guinea-pig', guineaPig);
  app.all('/test/guinea-pig-scrollable', guineaPigScrollable);
  app.all('/test/guinea-pig-app-banner', guineaPigAppBanner);
}

/**
 * Normalize base path string (leading slash, no trailing slash).
 *
 * @param basePath - Raw base path
 * @returns Normalized base path
 */
export function normalizeBasePath(basePath: string): string {
  if (!_.isString(basePath)) {
    throw new Error(`Invalid path prefix ${basePath}`);
  }

  basePath = basePath.replace(/\/$/, '');

  if (basePath !== '' && !basePath.startsWith('/')) {
    basePath = `/${basePath}`;
  }

  return basePath;
}

async function createServer(
  app: Express,
  cliArgs?: Partial<ServerArgs>
): Promise<HttpServer> {
  const {sslCertificatePath, sslKeyPath} = cliArgs ?? {};
  if (!sslCertificatePath && !sslKeyPath) {
    return http.createServer(app);
  }
  if (!sslCertificatePath || !sslKeyPath) {
    throw new Error(
      `Both certificate path and key path must be provided to enable TLS`
    );
  }

  const certKey = [sslCertificatePath, sslKeyPath];
  const zipped = _.zip(
    await B.all(certKey.map((p) => fs.exists(p))),
    ['certificate', 'key'],
    certKey
  ) as [boolean, string, string][];
  for (const [exists, desc, p] of zipped) {
    if (!exists) {
      throw new Error(
        `The provided SSL ${desc} at '${p}' does not exist or is not accessible`
      );
    }
  }
  const [cert, key] = await B.all(
    certKey.map((p) => fs.readFile(p, 'utf8'))
  ) as [string, string];
  log.debug('Enabling TLS/SPDY on the server using the provided certificate');

  const spdy = require('spdy') as {
    createServer: (
      options: {cert: string; key: string; spdy: {plain: boolean; ssl: boolean}},
      requestListener: express.RequestHandler
    ) => HttpServer;
  };
  return spdy.createServer(
    {
      cert,
      key,
      spdy: {
        plain: false,
        ssl: true,
      },
    },
    app
  );
}

/**
 * Attaches Appium-specific behavior to the HTTP server and returns it as {@linkcode AppiumServer}.
 * Mutates the `httpServer` parameter.
 *
 * @param opts - Configuration options
 * @returns The same server instance typed as AppiumServer
 */
function configureHttp({
  httpServer,
  reject,
  keepAliveTimeout,
  gracefulShutdownTimeout,
}: ConfigureHttpOpts): AppiumServer {
  const appiumServer = httpServer as unknown as AppiumServer;
  appiumServer.webSocketsMapping = {};
  appiumServer.addWebSocketHandler = addWebSocketHandler;
  appiumServer.removeWebSocketHandler = removeWebSocketHandler;
  appiumServer.removeAllWebSocketHandlers = removeAllWebSocketHandlers;
  appiumServer.getWebSocketHandlers = getWebSocketHandlers;
  appiumServer.isSecure = function isSecure() {
    return Boolean((this as unknown as {_spdyState?: {secure?: boolean}})._spdyState?.secure);
  };

  if (hasShouldUpgradeCallback(httpServer)) {
    (appiumServer as unknown as {shouldUpgradeCallback?: (req: http.IncomingMessage) => boolean}).shouldUpgradeCallback = (req) =>
      _.toLower(req.headers?.upgrade) === 'websocket';
    appiumServer.on('upgrade', (req, socket, head) => {
      if (!tryHandleWebSocketUpgrade(req, socket, head, appiumServer.webSocketsMapping)) {
        socket.destroy();
      }
    });
  }

  const originalClose = appiumServer.close.bind(appiumServer);
  appiumServer.close = async () =>
    await new B<void>((_resolve, _reject) => {
      log.info('Closing Appium HTTP server');
      const timer = new timing.Timer().start();
      const onTimeout = setTimeout(() => {
        if ((gracefulShutdownTimeout ?? 0) > 0) {
          log.info(
            `Not all active connections have been closed within ${gracefulShutdownTimeout}ms. ` +
              `This timeout might be customized by the --shutdown-timeout command line ` +
              `argument. Closing the server anyway.`
          );
        }
        process.exit(process.exitCode ?? 0);
      }, gracefulShutdownTimeout ?? 0);
      httpServer.once('close', () => {
        log.info(
          `Appium HTTP server has been successfully closed after ` +
            `${timer.getDuration().asMilliSeconds.toFixed(0)}ms`
        );
        clearTimeout(onTimeout);
        _resolve();
      });
      originalClose((err?: Error) => {
        if (err) {
          _reject(err);
        }
      });
    });

  appiumServer.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRNOTAVAIL') {
      log.error(
        'Could not start REST http interface listener. ' +
          'Requested address is not available.'
      );
    } else {
      log.error(
        'Could not start REST http interface listener. The requested ' +
          'port may already be in use. Please make sure there is no ' +
          'other instance of this server running already.'
      );
    }
    reject(err);
  });

  appiumServer.on('connection', (socket) => socket.setTimeout(keepAliveTimeout));

  return appiumServer;
}

async function startServer({
  httpServer,
  port,
  hostname,
  keepAliveTimeout,
  requestTimeout,
}: StartServerOpts): Promise<void> {
  const start = B.promisify(httpServer.listen, {
    context: httpServer,
  }) as (port: number, hostname?: string) => B<HttpServer>;
  const startPromise = start(port, hostname);
  httpServer.keepAliveTimeout = keepAliveTimeout;
  if (_.isInteger(requestTimeout)) {
    httpServer.requestTimeout = Number(requestTimeout);
  }
  httpServer.headersTimeout = keepAliveTimeout + 5 * 1000;
  await startPromise;
}

/**
 * Checks if the server supports `shouldUpgradeCallback` (Node.js v22.21.0+ / v24.9.0+).
 *
 * @param server - The HTTP server instance
 * @returns true if shouldUpgradeCallback is available
 */
function hasShouldUpgradeCallback(server: HttpServer): boolean {
  try {
    return (
      typeof (server as unknown as {shouldUpgradeCallback?: unknown}).shouldUpgradeCallback !==
      'undefined'
    );
  } catch {
    return false;
  }
}
