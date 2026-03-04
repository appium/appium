import path from 'node:path';
import {log} from './logger';
import _ from 'lodash';
import {fs} from '@appium/support';
import B from 'bluebird';
import type {Request, Response} from 'express';

export const STATIC_DIR = _.isNull(path.resolve(__dirname).match(/build[/\\]lib[/\\]express$/))
  ? path.resolve(__dirname, '..', '..', 'static')
  : path.resolve(__dirname, '..', '..', '..', 'static');

type TemplateParams = Record<string, unknown>;

/** Dynamic page mapped to /test/guinea-pig */
export async function guineaPig(req: Request, res: Response): Promise<void> {
  await guineaPigTemplate(req, res, 'guinea-pig.html');
}

/** Dynamic page mapped to /test/guinea-pig-scrollable */
export async function guineaPigScrollable(req: Request, res: Response): Promise<void> {
  await guineaPigTemplate(req, res, 'guinea-pig-scrollable.html');
}

/** Dynamic page mapped to /test/guinea-pig-app-banner */
export async function guineaPigAppBanner(req: Request, res: Response): Promise<void> {
  await guineaPigTemplate(req, res, 'guinea-pig-app-banner.html');
}

/** Dynamic page mapped to /welcome */
export async function welcome(req: Request, res: Response): Promise<void> {
  const params: TemplateParams = {message: "Let's browse!"};
  log.debug(`Sending welcome response with params: ${JSON.stringify(params)}`);
  const template = await getTemplate('welcome.html');
  res.send(template(params));
}

async function guineaPigTemplate(
  req: Request,
  res: Response,
  page: string
): Promise<void> {
  const delay = parseInt(
    String(req.params.delay ?? (req.query?.delay ?? 0)),
    10
  );
  const throwError = String(req.params.throwError ?? req.query?.throwError ?? '');
  const params: TemplateParams = {
    throwError,
    serverTime: new Date(),
    userAgent: req.headers['user-agent'],
    comment: 'None',
  };
  if (req.method === 'POST' && req.body && typeof req.body === 'object' && 'comments' in req.body) {
    params.comment = String((req.body as {comments?: string}).comments ?? params.comment);
  }
  log.debug(`Sending guinea pig response with params: ${JSON.stringify(params)}`);
  if (delay) {
    log.debug(`Waiting ${delay}ms before responding`);
    await B.delay(delay);
  }
  res.set('content-type', 'text/html');
  res.cookie('guineacookie1', 'i am a cookie value', {path: '/'});
  res.cookie('guineacookie2', 'cookié2', {path: '/'});
  res.cookie('guineacookie3', 'cant access this', {
    domain: '.blargimarg.com',
    path: '/',
  });
  const template = await getTemplate(page);
  res.send(template(params));
}

async function getTemplate(
  templateName: string
): Promise<(params: TemplateParams) => string> {
  const content = await fs.readFile(path.resolve(STATIC_DIR, 'test', templateName));
  return _.template(content.toString()) as (params: TemplateParams) => string;
}
