/**
 * Interface for all WebDriver extension commands from other protocols proxied to the external driver.
 */
export interface IOtherProtocolCommands {

  /**
   * Chromium DevTools
   */

  /**
   * Execute a devtools command
   *
   * @param cmd - the command
   * @param params - any command-specific command parameters
   *
   * @returns The result of the command execution
   */
  executeCdp?(cmd: string, params: unknown): Promise<unknown>;

  /**
   * Permissions
   */

  /**
   * Set the permission state of a PermissionDescriptor
   * @see {@link https://www.w3.org/TR/permissions/#webdriver-command-set-permission}
   *
   * @param descriptor - the PermissionDescriptor
   * @param state - the new state
   */
  setPermissions?(descriptor: PermissionDescriptor, state: PermissionState): Promise<void>;

  /**
   * Reporting
   */

  /**
   * Generate a test report for registered observers
   * @see {@link https://www.w3.org/TR/reporting-1/#generate-test-report-command}
   *
   * @param message - the message to be displayed in the report
   * @param group - the destination group to deliver the report to
   */
  generateTestReport?(message: string, group?: string): Promise<void>;

  /**
   * Device Posture
   */

  /**
   * Override the device posture
   * @see {@link https://www.w3.org/TR/device-posture/#set-device-posture}
   *
   * @param posture - the posture to which the device should be set
   */

  setDevicePosture?(posture: DevicePostureType): Promise<void>;
  /**
   * Return device posture control back to hardware
   * @see {@link https://www.w3.org/TR/device-posture/#clear-device-posture}
   */
  clearDevicePosture?(): Promise<void>;

  /**
   * Generic Sensor
   */

  /**
   * Create a virtual sensor
   * @see {@link https://www.w3.org/TR/generic-sensor/#create-virtual-sensor-command}
   *
   * @param type - the virtual sensor type to create
   * @param connected - whether the sensor should be configured as connected
   * @param maxSamplingFrequency - the maximum sampling frequency of this sensor
   * @param minSamplingFrequency - the minimum sampling frequency of this sensor
   */
  createVirtualSensor?(
    type: string,
    connected?: boolean,
    maxSamplingFrequency?: number,
    minSamplingFrequency?: number,
  ): Promise<void>;

  /**
   * Retrieve information about a virtual sensor
   * @see {@link https://www.w3.org/TR/generic-sensor/#get-virtual-sensor-information-command}
   *
   * @param sensorType - the virtual sensor type
   *
   * @returns an object with sensor information such as its requested sampling frequency
   */
  getVirtualSensorInfo?(sensorType: string): Promise<VirtualSensorInfo>;

  /**
   * Update a virtual sensor with a new reading
   * @see {@link https://www.w3.org/TR/generic-sensor/#update-virtual-sensor-reading-command}
   *
   * @param sensorType - the virtual sensor type
   * @param reading - sensor type-specific sensor reading data
   */
  updateVirtualSensorReading?(sensorType: string, reading: VirtualSensorReading): Promise<void>;

  /**
   * Delete a virtual sensor
   * @see {@link https://www.w3.org/TR/generic-sensor/#delete-virtual-sensor-command}
   *
   * @param sensorType - the virtual sensor type
   */
  deleteVirtualSensor?(sensorType: string): Promise<void>;

  /**
   * Custom Handlers
   */

  /**
   * Set the protocol handler automation mode
   * @see {@link https://html.spec.whatwg.org/multipage/system-state.html#user-agent-automation}
   *
   * @param mode - the protocol handler automation mode
   */
  setRPHRegistrationMode?(mode: RPHRegistrationMode): Promise<void>;

  /**
   * Secure Payment Confirmation
   */

  /**
   * Set the current transaction automation mode
   * @see {@link https://www.w3.org/TR/secure-payment-confirmation/#sctn-automation-set-spc-transaction-mode}
   *
   * @param mode - the transaction automation mode
   */
  setSPCTransactionMode?(mode: SPCTransactionMode): Promise<void>;

  /**
   * Compute Pressure
   */

  /**
   * Create a virtual pressure source
   * @see {@link https://www.w3.org/TR/compute-pressure/#create-virtual-pressure-source}
   *
   * @param type - the virtual pressure source type to create
   * @param supported - whether the pressure source should be configured as supported
   */
  createVirtualPressureSource?(type: string, supported?: boolean): Promise<void>;

  /**
   * Update the state of a virtual pressure source
   * @see {@link https://www.w3.org/TR/compute-pressure/#update-virtual-pressure-source}
   *
   * @param sensorType - the virtual pressure source type
   * @param sample - the pressure state
   */
  updateVirtualPressureSource?(pressureSourceType: string, sample: PressureSourceState): Promise<void>;

  /**
   * Delete a virtual pressure source
   * @see {@link https://www.w3.org/TR/compute-pressure/#delete-virtual-pressure-source}
   *
   * @param pressureSourceType - the virtual pressure source type
   */
  deleteVirtualPressureSource?(pressureSourceType: string): Promise<void>;

  /**
   * Federated Credential Management
   */

  /**
   * Cancel the currently open FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-canceldialog}
   */
  fedCMCancelDialog?(): Promise<void>;

  /**
   * Select an account to use for the currently open FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-selectaccount}
   *
   * @param accountIndex - index of the account in the list of available accounts
   */
  fedCMSelectAccount?(accountIndex: number): Promise<void>;

  /**
   * Click a button in the currently open FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-clickdialogbutton}
   *
   * @param dialogButton - button identifier
   */
  fedCMClickDialogButton?(dialogButton: string): Promise<void>;

  /**
   * Return all accounts that the user can select in the currently open FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-accountlist}
   *
   * @returns list of account objects
   */
  fedCMGetAccounts?(): Promise<FedCMAccount[]>;

  /**
   * Return the title and subtitle (if one exists) of the currently open FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-gettitle}
   *
   * @returns dialog title and subtitle (if one exists)
   */
  fedCMGetTitle?(): Promise<FedCMDialogTitle>;

  /**
   * Return the type of the currently open FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-getdialogtype}
   *
   * @returns dialog type
   */
  fedCMGetDialogType?(): Promise<string>;

  /**
   * Set the state of the promise rejection delay
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-setdelayenabled}
   */
  fedCMSetDelayEnabled?(enabled: boolean): Promise<void>;

  /**
   * Reset the cooldown delay used after dismissing a FedCM dialog
   * @see {@link https://www.w3.org/TR/fedcm-1/#webdriver-resetcooldown}
   */
  fedCMResetCooldown?(): Promise<void>;

  /**
   * Web Authentication
   */

  /**
   * Add a virtual authenticator to a browser
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-add-virtual-authenticator}
   *
   * @param protocol - the protocol
   * @param transport - a valid AuthenticatorTransport value
   * @param hasResidentKey - whether there is a resident key
   * @param hasUserVerification - whether the authenticator has user verification
   * @param isUserConsenting - whether it is a user consenting authenticator
   * @param isUserVerified - whether the user is verified
   *
   * @returns The authenticator ID
   */
  addVirtualAuthenticator?(
    protocol: 'ctap/u2f' | 'ctap2' | 'ctap2_1',
    transport: string,
    hasResidentKey?: boolean,
    hasUserVerification?: boolean,
    isUserConsenting?: boolean,
    isUserVerified?: boolean,
  ): Promise<string>;

  /**
   * Remove a virtual authenticator
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-remove-virtual-authenticator}
   *
   * @param authenticatorId - the ID returned in the call to add the authenticator
   */
  removeVirtualAuthenticator?(authenticatorId: string): Promise<void>;

  /**
   * Inject a public key credential source into a virtual authenticator
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-add-credential}
   *
   * @param credentialId - the base64 encoded credential ID
   * @param isResidentCredential - if true, a client-side credential, otherwise a server-side
   * credential
   * @param rpId - the relying party ID the credential is scoped to
   * @param privateKey - the base64 encoded private key package
   * @param userHandle - the base64 encoded user handle
   * @param signCount - the initial value for a signature counter
   */
  addAuthCredential?(
    credentialId: string,
    isResidentCredential: boolean,
    rpId: string,
    privateKey: string,
    userHandle: string,
    signCount: number,
    authenticatorId: string,
  ): Promise<void>;

  /**
   * Get the list of public key credential sources
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-get-credentials}
   *
   * @returns The list of Credentials
   */
  getAuthCredential?(): Promise<Credential[]>;

  /**
   * Remove all auth credentials
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-remove-all-credentials}
   */
  removeAllAuthCredentials?(): Promise<void>;

  /**
   * Remove a specific auth credential
   *
   * @param credentialId - the credential ID
   * @param authenticatorId - the authenticator ID
   */
  removeAuthCredential?(credentialId: string, authenticatorId: string): Promise<void>;

  /**
   * Set the isUserVerified property of an authenticator
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-set-user-verified}
   *
   * @param isUserVerified - the value of the isUserVerified property
   * @param authenticatorId - the authenticator id
   */
  setUserAuthVerified?(isUserVerified: boolean, authenticatorId: string): Promise<void>;
}

// Permissions

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface PermissionDescriptor {
  name: string;
  [key: string]: any;
}

// Device Posture

export type DevicePostureType = 'continuous' | 'folded';

// Generic Sensor

export interface VirtualSensorInfo {
  requestedSamplingFrequency: number;
}

export interface VirtualSensorXYZReading {
  x: number;
  y: number;
  z: number;
}

export interface VirtualSensorSingleValueReading {
  [key: string]: number;
}

export type VirtualSensorReading = VirtualSensorXYZReading | VirtualSensorSingleValueReading;

// Custom Handlers

export type RPHRegistrationMode = 'autoAccept' | 'autoReject' | 'none';

// Secure Payment Confirmation

export type SPCTransactionMode = 'autoAccept' | 'autoChooseToAuthAnotherWay' | 'autoReject' | 'autoOptOut';

// Compute Pressure

export type PressureSourceState = 'nominal' | 'fair' | 'serious' | 'critical';

// Federated Credential Management

export interface FedCMAccount {
  accountId: string;
  email: string;
  name: string;
  givenName?: string;
  pictureUrl?: string;
  idpConfigUrl: string;
  loginState: string;
  termsOfServiceUrl?: string;
  privacyPolicyUrl?: string;
}

export interface FedCMDialogTitle {
  title: string;
  subtitle?: string;
}

// Web Authentication

export interface Credential {
  credentialId: string;
  isResidentCredential: boolean;
  rpId: string;
  privateKey: string;
  userHandle?: string;
  signCount: number;
  largeBlob?: string;
}
