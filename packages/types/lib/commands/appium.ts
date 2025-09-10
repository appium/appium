/**
 * Interface for all Appium extension commands proxied to the external driver.
 */
export interface IAppiumCommands {
    /**
   * Get the current time on the device under timeouts
   *
   * @param format - the date/time format you would like the response into
   *
   * @returns The formatted time
   */
  getDeviceTime?(format?: string): Promise<string>;

  /**
   * Install an app on a device
   *
   * @param appPath - the absolute path to a local app or a URL of a downloadable app bundle
   * @param options - driver-specific install options
   */
  installApp?(appPath: string, options?: unknown): Promise<void>;

  /**
   * Launch an app
   *
   * @param appId - the package or bundle ID of the application
   * @param options - driver-specific launch options
   */
  activateApp?(appId: string, options?: unknown): Promise<void>;

  /**
   * Remove / uninstall an app
   *
   * @param appId - the package or bundle ID of the application
   * @param options - driver-specific launch options
   *
   * @returns `true` if successful
   */
  removeApp?(appId: string, options?: unknown): Promise<boolean>;

  /**
   * Quit / terminate / stop a running application
   *
   * @param appId - the package or bundle ID of the application
   * @param options - driver-specific launch options
   */
  terminateApp?(appId: string, options?: unknown): Promise<boolean>;

  /**
   * Determine whether an app is installed
   *
   * @param appId - the package or bundle ID of the application
   */
  isAppInstalled?(appId: string): Promise<boolean>;

  /**
   * Get the running state of an app
   *
   * @param appId - the package or bundle ID of the application
   *
   * @returns A number representing the state. `0` means not installed, `1` means not running, `2`
   * means running in background but suspended, `3` means running in the background, and `4` means
   * running in the foreground
   */
  queryAppState?(appId: string): Promise<0 | 1 | 2 | 3 | 4>;

  /**
   * Attempt to hide a virtual keyboard
   *
   * @param strategy - the driver-specific name of a hiding strategy to follow
   * @param key - the text of a key to use to hide the keyboard
   * @param keyCode - a key code to trigger to hide the keyboard
   * @param keyName - the name of a key to use to hide the keyboard
   *
   * @returns Whether the keyboard was successfully hidden. May never return `false` on some platforms
   */
  hideKeyboard?(
    strategy?: string,
    key?: string,
    keyCode?: string,
    keyName?: string,
  ): Promise<boolean>;

  /**
   * Determine whether the keyboard is shown
   *
   * @returns Whether the keyboard is shown
   */
  isKeyboardShown?(): Promise<boolean>;

  /**
   * Push data to a file at a remote path on the device
   *
   * @param path - the remote path on the device to create the file at
   * @param data - the base64-encoded data which will be decoded and written to `path`
   */
  pushFile?(path: string, data: string): Promise<void>;

  /**
   * Retrieve the data from a file on the device at a given path
   *
   * @param path - the remote path on the device to pull file data from
   *
   * @returns The base64-encoded file data
   */
  pullFile?(path: string): Promise<string>;

  /**
   * Retrieve the data from a folder on the device at a given path
   *
   * @param path - the remote path of a directory on the device
   *
   * @returns The base64-encoded zip file of the directory contents
   */
  pullFolder?(path: string): Promise<string>;
}
