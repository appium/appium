const DEFAULT_PORTS: Record<string, number> = {http: 80, https: 443};

/**
 * Determines the HTTP proxy the HTTP client would route a request through, according to the
 * `<scheme>_proxy`, `all_proxy` and `no_proxy` environment variables.
 *
 * This mirrors the proxy selection of `proxy-from-env@2`, which axios applies to every request
 * without an explicit `proxy` option, and must be kept in sync with it. In particular, the
 * `npm_config_*` variables are NOT consulted (unlike `proxy-from-env@1`): consulting them here
 * would make this resolver disagree with axios about whether a request is proxied.
 */
export class EnvProxyResolver {
  constructor(private readonly _env: NodeJS.ProcessEnv = process.env) {}

  /**
   * Returns the URL of the proxy a request to the given URL would be routed through,
   * or an empty string if the request would be sent directly.
   */
  getProxyForUrl(url: URL): string {
    const proto = url.protocol.replace(/:$/, '');
    const port = parseInt(url.port, 10) || DEFAULT_PORTS[proto] || 0;
    // `url.hostname` keeps the brackets around IPv6 addresses, just like proxy-from-env does
    if (!this._shouldProxy(url.hostname, port)) {
      return '';
    }
    const proxy = this._getEnv(`${proto}_proxy`) || this._getEnv('all_proxy');
    return proxy && !proxy.includes('://') ? `${proto}://${proxy}` : proxy;
  }

  /**
   * @param hostname - The hostname of the URL (IPv6 addresses are wrapped in brackets)
   * @param port - The effective port of the URL
   */
  private _shouldProxy(hostname: string, port: number): boolean {
    const noProxy = this._getEnv('no_proxy').toLowerCase();
    if (!noProxy) {
      return true;
    }
    if (noProxy === '*') {
      return false;
    }
    return noProxy.split(/[,\s]/).every((entry) => {
      if (!entry) {
        return true;
      }
      const withPort = /^(.+):(\d+)$/.exec(entry);
      let entryHostname = withPort ? withPort[1] : entry;
      const entryPort = withPort ? parseInt(withPort[2], 10) : 0;
      if (entryPort && entryPort !== port) {
        return true;
      }
      if (!/^[.*]/.test(entryHostname)) {
        return hostname !== entryHostname;
      }
      if (entryHostname.startsWith('*')) {
        entryHostname = entryHostname.slice(1);
      }
      return !hostname.endsWith(entryHostname);
    });
  }

  private _getEnv(key: string): string {
    return this._env[key.toLowerCase()] || this._env[key.toUpperCase()] || '';
  }
}
