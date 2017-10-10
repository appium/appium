import path from 'path';
import log from './logger';
import _ from 'lodash';
import { fs } from 'appium-support';
import B from 'bluebird';


let STATIC_DIR = path.resolve(__dirname, '..', '..', '..', 'static');
if (_.isNull(path.resolve(__dirname).match(/build[\/\\]lib[\/\\]express$/))) {
  // in some contexts we are not in the build directory,
  // so we don't want to go back the extra level
  STATIC_DIR = path.resolve(__dirname, '..', '..', 'static');
}

async function guineaPigTemplate (req, res, page) {
  let delay = parseInt(req.params.delay || req.query.delay || 0, 10);
  let throwError = req.params.throwError || req.query.throwError || '';
  let params = {
    throwError,
    serverTime: parseInt(Date.now() / 1000, 10),
    userAgent: req.headers['user-agent'],
    comment: 'None'
  };
  if (req.method === 'POST') {
    params.comment = req.body.comments || params.comment;
  }
  log.debug(`Sending guinea pig response with params: ${JSON.stringify(params)}`);
  if (delay) {
    log.debug(`Waiting ${delay}ms before responding`);
    await B.delay(delay);
  }
  res.set('Content-Type', 'text/html');
  res.cookie('guineacookie1', 'i am a cookie value', {path: '/'});
  res.cookie('guineacookie2', 'cookié2', {path: '/'});
  res.cookie('guineacookie3', 'cant access this', {
    domain: '.blargimarg.com',
    path: '/'
  });
  res.send((await getTemplate(page))(params));
}

/*
 * Dynamic page mapped to /test/guinea-pig
 */
async function guineaPig (req, res) {
  return await guineaPigTemplate(req, res, 'guinea-pig.html');
}

/*
 * Dynamic page mapped to /test/guinea-pig-scrollable
 */
async function guineaPigScrollable (req, res) {
  return await guineaPigTemplate(req, res, 'guinea-pig-scrollable.html');
}

/*
 * Dynamic page mapped to /test/guinea-pig-app-banner
 */
async function guineaPigAppBanner (req, res) {
  return await guineaPigTemplate(req, res, 'guinea-pig-app-banner.html');
}

/*
 * Dynamic page mapped to /welcome
 */
async function welcome (req, res) {
  let params = {message: 'Let\'s browse!'};
  log.debug(`Sending welcome response with params: ${JSON.stringify(params)}`);
  res.send((await getTemplate('welcome.html'))(params));
}

async function getTemplate (templateName) {
  let content = await fs.readFile(path.resolve(STATIC_DIR, 'test', templateName));
  return _.template(content.toString());
}

export { guineaPig, guineaPigScrollable, guineaPigAppBanner, welcome, STATIC_DIR };
