/**
 * Interface for all JSONWP commands proxied to the external driver.
 */
export interface IJSONWPCommands {
  /**
   * Get the device orientation
   *
   * @returns The orientation string
   */
  getOrientation?(): Promise<string>;

  /**
   * Set the device orientation
   *
   * @param orientation - the orientation string
   */
  setOrientation?(orientation: string): Promise<void>;
}

export type Orientation = 'LANDSCAPE' | 'PORTRAIT';
