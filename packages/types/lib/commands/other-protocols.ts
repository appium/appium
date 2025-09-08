/**
 * Interface for all WebDriver extension commands from other protocols proxied to the external driver.
 */
export interface IOtherProtocolCommands {
  // Chromium DevTools

  /**
   * Execute a devtools command
   *
   * @param cmd - the command
   * @param params - any command-specific command parameters
   *
   * @returns The result of the command execution
   */
  executeCdp?(cmd: string, params: unknown): Promise<unknown>;

  // Web Authentication

  /**
   * Add a virtual authenticator to a browser
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-add-virtual-authenticator}
   *
   * @param protocol  - the protocol
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
