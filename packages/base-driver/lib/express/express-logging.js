import _ from 'lodash';
import '@colors/colors';
import morgan from 'morgan';
import log from './logger';
import {MAX_LOG_BODY_LENGTH} from '../constants';

// Copied the morgan compile function over so that cooler formats
// may be configured
function compile(fmt) {
  // escape quotes
  fmt = fmt.replace(/"/g, '\\"');
  fmt = fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function replace(_, name, arg) {
    return `"\n    + (tokens["${name}"](req, res, "${arg}") || "-") + "`;
  });
  let js = `  return "${fmt}";`;
  return new Function('tokens, req, res', js);
}

function requestEndLoggingFormat(tokens, req, res) {
  let status = res.statusCode;
  let statusStr = ':status';
  if (status >= 500) {
    statusStr = statusStr.red;
  } else if (status >= 400) {
    statusStr = statusStr.yellow;
  } else if (status >= 300) {
    statusStr = statusStr.cyan;
  } else {
    statusStr = statusStr.green;
  }
  let fn = compile(
    `${'<-- :method :url '.white}${statusStr} ${':response-time ms - :res[content-length]'.grey}`
  );
  return fn(tokens, req, res);
}

const endLogFormatter = morgan((tokens, req, res) => {
  log.info(requestEndLoggingFormat(tokens, req, res), (res.jsonResp || '').grey);
});

const requestStartLoggingFormat = compile(`${'-->'.white} ${':method'.white} ${':url'.white}`);

const startLogFormatter = morgan(
  (tokens, req, res) => {
    // morgan output is redirected straight to winston
    let reqBody = '';
    if (req.body) {
      try {
        reqBody = _.truncate(_.isString(req.body) ? req.body : JSON.stringify(req.body), {
          length: MAX_LOG_BODY_LENGTH,
        });
      } catch {}
    }
    log.info(requestStartLoggingFormat(tokens, req, res), reqBody.grey);
  },
  {immediate: true}
);

export {endLogFormatter, startLogFormatter};
