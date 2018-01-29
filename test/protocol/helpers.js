import Express from 'express';
import bodyParser from 'body-parser';

export function createProxyServer (sessionId, port) {
  // Start an express server for proxying
  let app = new Express();
  app.use(bodyParser.json());
  let server = app.listen(port);
  return {app, server};
}

let handlers = {
  post: {},
  get: {},
  delete: {},
  put: {},
};

export function addHandler (app, method, url, handler) {
  method = method.toLowerCase();
  if (!handlers[method][url]) {
    app[method](url, (req, res) => handlers[method][url].call(this, req, res));
  }
  handlers[method][url] = handler;
}