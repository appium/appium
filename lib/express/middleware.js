import log from './logger';
import { errors } from '../mjsonwp';


function allowCrossDomain (req, res, next) {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS,DELETE');
    res.header('Access-Control-Allow-Headers', 'origin, content-type, accept');

    // need to respond 200 to OPTIONS
    if ('OPTIONS' === req.method) {
      res.sendStatus(200);
    } else {
      next();
    }
  } catch (err) {
    log.error(`Unexpected error: ${err.stack}`);
    next();
  }
}

function fixPythonContentType (req, res, next) {
  // hack because python client library gives us wrong content-type
  if (/^\/wd/.test(req.path) && /^Python/.test(req.headers['user-agent'])) {
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      req.headers['content-type'] = 'application/json';
    }
  }
  next();
}

function defaultToJSONContentType (req, res, next) {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json';
  }
  next();
}

function catchAllHandler (err, req, res, next) {
  log.error(`Uncaught error: ${err.message}`);
  log.error('Sending generic error response');
  try {
    res.status(500).send({
      status: errors.UnknownError.code(),
      value: `ERROR running Appium command: ${err.message}`
    });
    log.error(err);
  } catch (ign) {
    next(ign);
  }
}

function catch4XXHandler (err, req, res, next) {
  if (err.status >= 400 && err.status < 500) {
    // set the content type to `text/plain`
    // https://code.google.com/p/selenium/wiki/JsonWireProtocol#Responses
    log.debug(`Setting content type to 'text/plain' for HTTP status '${err.status}'`);
    res.set('Content-Type', 'text/plain');
    res.status(err.status).send(`Unable to process request: ${err.message}`);
  } else {
    next(err);
  }
}

function catch404Handler (req, res) {
  // set the content type to `text/plain`
  // https://code.google.com/p/selenium/wiki/JsonWireProtocol#Responses
  log.debug('No route found. Setting content type to \'text/plain\'');
  res.set('Content-Type', 'text/plain');
  res.status(404).send(`The URL '${req.originalUrl}' did not map to a valid resource`);
}

export { allowCrossDomain, fixPythonContentType, defaultToJSONContentType, catchAllHandler, catch404Handler, catch4XXHandler };
