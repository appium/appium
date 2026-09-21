import bodyParser from 'body-parser';
import Express from 'express';

export function createProxyServer(port: number): {
  app: Express.Application;
  server: ReturnType<Express.Application['listen']>;
} {
  const app = Express();
  app.use(bodyParser.json());
  const server = app.listen(port);
  return {app, server};
}
