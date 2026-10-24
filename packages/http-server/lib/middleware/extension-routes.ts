import {getResponseForW3CError, jsonParseErrors} from '@appium/base-driver';
import type {Express, NextFunction, Request, RequestHandler, Response, Router} from 'express';

const ROUTE_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

type ParamCallback = (req: Request, res: Response, next: NextFunction, value: unknown, name: string) => unknown;

interface RouteLayer {
  route?: ExtensionRoute;
  handle: RequestHandler & {stack?: RouteLayer[]; params?: Record<string, ParamCallback[]>};
  method?: string;
  /** `router.use(fn)` matches every path under the mount. A prefixed `app.use('/solo', fn)` does not. */
  slash?: boolean;
}

interface ExtensionRoute {
  stack: RouteLayer[];
  all: (...handlers: RequestHandler[]) => unknown;
  get: (...handlers: RequestHandler[]) => unknown;
  post: (...handlers: RequestHandler[]) => unknown;
  put: (...handlers: RequestHandler[]) => unknown;
  patch: (...handlers: RequestHandler[]) => unknown;
  delete: (...handlers: RequestHandler[]) => unknown;
  head: (...handlers: RequestHandler[]) => unknown;
  options: (...handlers: RequestHandler[]) => unknown;
}

/**
 * A route added by a server updater is not a WebDriver command.
 * When one of those routes matches, a JSON body that failed to parse is `invalid argument`
 * and that route's handler does not run. Middleware or a param callback added with the route
 * is not run either. A URL that matches none of them is left alone.
 */
export function rejectInvalidJsonOnExtensionRoutes(
  app: Express,
  frontRouter: Router,
  appRoutesBefore: number,
  frontRoutesBefore: number,
): void {
  const seen = new WeakSet<object>();
  wrapParamCallbacks(app.router as RouteLayer['handle'], seen);
  wrapParamCallbacks(frontRouter as RouteLayer['handle'], seen);
  rejectOnLayers(app.router.stack as RouteLayer[], appRoutesBefore, seen);
  rejectOnLayers(frontRouter.stack as RouteLayer[], frontRoutesBefore, seen);
}

/**
 * Ends the request when JSON parsing failed. Otherwise the matched handler runs.
 */
function rejectRecordedJson(req: Request, res: Response, next: NextFunction): void {
  const jsonParseError = jsonParseErrors.getInvalidArgument(req);
  if (!jsonParseError) {
    next();
    return;
  }
  const [status, body] = getResponseForW3CError(jsonParseError);
  res.status(status).json(body);
}

function rejectOnLayers(layers: RouteLayer[], fromIndex: number, seen: WeakSet<object>): void {
  for (const layer of layers.slice(fromIndex)) {
    if (layer.route) {
      prependJsonRejection(layer.route, seen);
      continue;
    }
    const nested = nestedRouterStack(layer.handle);
    if (nested) {
      wrapParamCallbacks(layer.handle, seen);
      rejectOnLayers(nested, 0, seen);
      continue;
    }
    wrapUseLayer(layer);
  }
}

/**
 * `router.param` runs before the route stack. A bad JSON body skips it.
 */
function wrapParamCallbacks(router: RouteLayer['handle'], seen: WeakSet<object>): void {
  if (seen.has(router) || !router.params) {
    return;
  }
  seen.add(router);

  for (const callbacks of Object.values(router.params)) {
    for (let i = 0; i < callbacks.length; i++) {
      const fn = callbacks[i];
      callbacks[i] = function rejectExtensionParam(
        req: Request,
        res: Response,
        next: NextFunction,
        value: unknown,
        name: string,
      ) {
        const jsonParseError = jsonParseErrors.getInvalidArgument(req);
        if (!jsonParseError) {
          return fn(req, res, next, value, name);
        }
        const [status, body] = getResponseForW3CError(jsonParseError);
        res.status(status).json(body);
      };
    }
  }
}

/**
 * `use` middleware runs before the route it was registered with.
 * A bad JSON body skips it. A prefix such as `app.use('/solo', fn)` is itself the handler,
 * so that prefix is `invalid argument`. A pathless `use` falls through, which keeps an
 * unknown URL on `frontRouter` from turning into `invalid argument`.
 */
function wrapUseLayer(layer: RouteLayer): void {
  const handle = layer.handle;
  if (handle.length > 3) {
    return;
  }
  layer.handle = function rejectExtensionUse(req: Request, res: Response, next: NextFunction): unknown {
    const jsonParseError = jsonParseErrors.getInvalidArgument(req);
    if (!jsonParseError) {
      return handle(req, res, next);
    }
    if (layer.slash) {
      next();
      return;
    }
    const [status, body] = getResponseForW3CError(jsonParseError);
    res.status(status).json(body);
  };
}

function prependJsonRejection(route: ExtensionRoute, seen: WeakSet<object>): void {
  if (seen.has(route)) {
    return;
  }
  seen.add(route);

  const methods = new Set(route.stack.map((layer) => layer.method).filter((method) => method));
  const matchesAll = route.stack.some((layer) => !layer.method);
  const existing = route.stack.splice(0, route.stack.length);
  if (matchesAll) {
    route.all(rejectRecordedJson);
  }
  for (const method of ROUTE_METHODS) {
    if (methods.has(method)) {
      route[method](rejectRecordedJson);
    }
  }
  route.stack.push(...existing);
}

function nestedRouterStack(handle: RouteLayer['handle']): RouteLayer[] | undefined {
  if (!Array.isArray(handle.stack)) {
    return;
  }
  return handle.stack;
}
