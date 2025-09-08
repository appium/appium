/**
 * Interface for all MJSONWP commands proxied to the external driver.
 */
export interface IMJSONWPCommands<Ctx = string> {
  /**
   * Get the currently active context
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts}
   *
   * @returns The context name
   */
  getCurrentContext?(): Promise<Ctx | null>;

  /**
   * Switch to a context by name
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts}
   *
   * @param name - the context name
   */
  setContext?(name: string, ...args: any[]): Promise<void>;

  /**
   * Get the list of available contexts
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts}
   *
   * @returns The list of context names
   */
  getContexts?(): Promise<Ctx[]>;

  /**
   * Get the network connection state of a device
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-modes}
   *
   * @returns A number which is a bitmask representing categories like Data, Wifi, and Airplane
   * mode status
   */
  getNetworkConnection?(): Promise<number>;

  /**
   * Set the network connection of the device
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-modes}
   *
   * @param type - the bitmask representing network state
   * @returns A number which is a bitmask representing categories like Data, Wifi, and Airplane
   * mode status
   */
  setNetworkConnection?(type: number): Promise<number>;

  /**
   * Get the current rotation state of the device
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-rotation}
   *
   * @returns The Rotation object consisting of x, y, and z rotation values (0 <= n <= 360)
   */
  getRotation?(): Promise<Rotation>;

  /**
   * Set the device rotation state
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-rotation}
   *
   * @param x - the degree to which the device is rotated around the x axis (0 <= x <= 360)
   * @param y - the degree to which the device is rotated around the y axis (0 <= y <= 360)
   * @param z - the degree to which the device is rotated around the z axis (0 <= z <= 360)
   */
  setRotation?(x: number, y: number, z: number): Promise<void>;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}
