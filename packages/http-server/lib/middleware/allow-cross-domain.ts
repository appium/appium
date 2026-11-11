import type {NextFunction, Request, Response} from 'express';

/**
 * Basic CORS middleware.
 * Sets permissive CORS headers and responds immediately to `OPTIONS` requests with 200.
 */
export function allowCrossDomain(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Cache-Control, Pragma, Origin, X-Requested-With, Content-Type, Accept, User-Agent',
  );

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}
