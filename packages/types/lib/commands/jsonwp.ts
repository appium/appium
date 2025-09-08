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

  /**
   * Get the virtual or real geographical location of a device
   *
   * @returns The location
   */
  getGeoLocation?(): Promise<Location>;

  /**
   * Set the virtual geographical location of a device
   *
   * @param location - the location including latitude and longitude
   * @returns The complete location
   */
  setGeoLocation?(location: Partial<Location>): Promise<Location>;
}

export type Orientation = 'LANDSCAPE' | 'PORTRAIT';

export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
}
