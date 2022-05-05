import Express from 'express';
import bodyParser from 'body-parser';

export function createProxyServer(sessionId, port) {
  // Start an express server for proxying
  let app = new Express();
  app.use(bodyParser.json());
  let server = app.listen(port);
  return {app, server};
}
