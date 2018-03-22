import path from 'path';
import express from 'express';
import http from 'http';
import favicon from 'serve-favicon';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import log from './logger';
import { startLogFormatter, endLogFormatter } from './express-logging';
import { allowCrossDomain, fixPythonContentType, defaultToJSONContentType,
         catchAllHandler, catch404Handler, catch4XXHandler } from './middleware';
import { guineaPig, guineaPigScrollable, guineaPigAppBanner, welcome, STATIC_DIR } from './static';
import { produceError, produceCrash } from './crash';
import { addWebSocketHandler, removeWebSocketHandler, removeAllWebSocketHandlers,
         getWebSocketHandlers } from './websocket';
import B from 'bluebird';


async function server (configureRoutes, port, hostname = null) {
  // create the actual http server
  let app = express();
  let httpServer = http.createServer(app);
  httpServer.addWebSocketHandler = addWebSocketHandler;
  httpServer.removeWebSocketHandler = removeWebSocketHandler;
  httpServer.removeAllWebSocketHandlers = removeAllWebSocketHandlers;
  httpServer.getWebSocketHandlers = getWebSocketHandlers;

  // http.Server.close() only stops new connections, but we need to wait until
  // all connections are closed and the `close` event is emitted
  let close = httpServer.close.bind(httpServer);
  httpServer.close = async () => {
    return await new B((resolve, reject) => {
      httpServer.on('close', resolve);
      close((err) => {
        if (err) reject(err); // eslint-disable-line curly
      });
    });
  };

  return await new B((resolve, reject) => {
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
      socket.setTimeout(600 * 1000); // 10 minute timeout
      socket.on('error', reject);
    });
    configureServer(app, configureRoutes);

    let serverArgs = [port];
    if (hostname) {
      // If the hostname is omitted, the server will accept
      // connections on any IP address
      serverArgs.push(hostname);
    }
    httpServer.listen(...serverArgs, (err) => {
      if (err) {
        reject(err);
      }
      resolve(httpServer);
    });
  });
}

function configureServer (app, configureRoutes) {
  app.use(endLogFormatter);

  // set up static assets
  app.use(favicon(path.resolve(STATIC_DIR, 'favicon.ico')));
  app.use(express.static(STATIC_DIR));

  // crash routes, for testing
  app.use('/wd/hub/produce_error', produceError);
  app.use('/wd/hub/crash', produceCrash);

  // add middlewares
  app.use(allowCrossDomain);
  app.use(fixPythonContentType);
  app.use(defaultToJSONContentType);
  app.use(bodyParser.urlencoded({extended: true}));
  app.use(methodOverride());
  app.use(catch4XXHandler);
  app.use(catchAllHandler);

  // make sure appium never fails because of a file size upload limit
  app.use(bodyParser.json({limit: '1gb'}));

  // set up start logging (which depends on bodyParser doing its thing)
  app.use(startLogFormatter);

  configureRoutes(app);

  // dynamic routes for testing, etc.
  app.all('/welcome', welcome);
  app.all('/test/guinea-pig', guineaPig);
  app.all('/test/guinea-pig-scrollable', guineaPigScrollable);
  app.all('/test/guinea-pig-app-banner', guineaPigAppBanner);

  // catch this last, so anything that falls through is 404ed
  app.use(catch404Handler);
}

export { server, configureServer };
