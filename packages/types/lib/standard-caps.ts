export type PageLoadingStrategy = 'none' | 'eager' | 'normal';
export type ProxyTypes = 'pac' | 'noproxy' | 'autodetect' | 'system' | 'manual';
export interface ProxyObject {
  proxyType?: ProxyTypes;
  proxyAutoconfigUrl?: string;
  ftpProxy?: string;
  ftpProxyPort?: number;
  httpProxy?: string;
  httpProxyPort?: number;
  sslProxy?: string;
  sslProxyPort?: number;
  socksProxy?: string;
  socksProxyPort?: number;
  socksVersion?: string;
  socksUsername?: string;
  socksPassword?: string;
}
export type Timeouts = Record<'script' | 'pageLoad' | 'implicit', number>;

export interface StandardCapabilities {
  /**
   * Identifies the user agent.
   */
  browserName?: string;
  /**
   * Identifies the version of the user agent.
   */
  browserVersion?: string;
  /**
   * Identifies the operating system of the endpoint node.
   */
  platformName?: string;
  /**
   * Indicates whether untrusted and self-signed TLS certificates are implicitly trusted on navigation for the duration of the session.
   */
  acceptInsecureCerts?: boolean;
  /**
   * Defines the current session’s page load strategy.
   */
  pageLoadStrategy?: PageLoadingStrategy;
  /**
   * Defines the current session’s proxy configuration.
   */
  proxy?: ProxyObject;
  /**
   * Indicates whether the remote end supports all of the resizing and repositioning commands.
   */
  setWindowRect?: boolean;
  /**
   * Describes the timeouts imposed on certain session operations.
   */
  timeouts?: Timeouts;
  /**
   * Defines the current session’s strict file interactability.
   */
  strictFileInteractability?: boolean;
  /**
   * Describes the current session’s user prompt handler. Defaults to the dismiss and notify state.
   */
  unhandledPromptBehavior?: string;
  /**
   * WebDriver clients opt in to a bidirectional connection by requesting a capability with the name "webSocketUrl" and value true.
   */
  webSocketUrl?: boolean;
}
