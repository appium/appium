import Express from 'express';
import bodyParser from 'body-parser';

export function createProxyServer(
  sessionId: string,
  port: number
): {app: Express.Application; server: ReturnType<Express.Application['listen']>} {
  const app = Express();
  app.use(bodyParser.json());
  const server = app.listen(port);
  return {app, server};
}
