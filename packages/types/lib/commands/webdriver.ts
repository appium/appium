import type {ActionSequence} from '../action';
import type {Element} from '../util';

/**
 * Interface for all standard WebDriver Classic commands proxied to the external driver.
 */
export interface IWDClassicCommands {
  /**
   * Navigate to a given url
   * @see {@link https://w3c.github.io/webdriver/#navigate-to}
   *
   * @param url - the url
   */
  setUrl?(url: string): Promise<void>;

  /**
   * Get the current url
   * @see {@link https://w3c.github.io/webdriver/#get-current-url}
   *
   * @returns The url
   */
  getUrl?(): Promise<string>;

  /**
   * Navigate back in the page history
   * @see {@link https://w3c.github.io/webdriver/#back}
   */
  back?(): Promise<void>;

  /**
   * Navigate forward in the page history
   * @see {@link https://w3c.github.io/webdriver/#forward}
   */
  forward?(): Promise<void>;

  /**
   * Refresh the page
   * @see {@link https://w3c.github.io/webdriver/#refresh}
   */
  refresh?(): Promise<void>;

  /**
   * Get the current page title
   * @see {@link https://w3c.github.io/webdriver/#get-title}
   *
   * @returns The title
   *
   * @example
   * ```js
   * await driver.getTitle()
   * ```
   * ```py
   * driver.title
   * ```
   * ```java
   * driver.getTitle();
   * ```
   */
  title?(): Promise<string>;

  /**
   * Get the handle (id) associated with the current browser window
   * @see {@link https://w3c.github.io/webdriver/#get-window-handle}
   *
   * @returns The handle string
   */
  getWindowHandle?(): Promise<string>;

  /**
   * Close the current browsing context (window)
   * @see {@link https://w3c.github.io/webdriver/#close-window}
   *
   * @returns An array of window handles representing currently-open windows
   */
  closeWindow?(): Promise<string[]>;

  /**
   * Switch to a specified window
   * @see {@link https://w3c.github.io/webdriver/#switch-to-window}
   *
   * @param handle - the window handle of the window to make active
   */
  setWindow?(handle: string): Promise<void>;

  /**
   * Get a set of handles representing open browser windows
   * @see {@link https://w3c.github.io/webdriver/#get-window-handles}
   *
   * @returns An array of window handles representing currently-open windows
   */
  getWindowHandles?(): Promise<string[]>;

  /**
   * Create a new browser window
   * @see {@link https://w3c.github.io/webdriver/#new-window}
   *
   * @param type - a hint to the driver whether to create a "tab" or "window"
   *
   * @returns An object containing the handle of the newly created window and its type
   */
  createNewWindow?(type?: NewWindowType): Promise<NewWindow>;

  /**
   * Switch the current browsing context to a frame
   * @see {@link https://w3c.github.io/webdriver/#switch-to-frame}
   *
   * @param id - the frame id, index, or `null` (indicating the top-level context)
   */
  setFrame?(id: null | number | string): Promise<void>;

  /**
   * Set the current browsing context to the parent of the current context
   * @see {@link https://w3c.github.io/webdriver/#switch-to-parent-frame}
   */
  switchToParentFrame?(): Promise<void>;

  /**
   * Get the size and position of the current window
   * @see {@link https://w3c.github.io/webdriver/#get-window-rect}
   *
   * @returns A `Rect` JSON object with x, y, width, and height properties
   */
  getWindowRect?(): Promise<Rect>;

  /**
   * Set the current window's size and position
   * @see {@link https://w3c.github.io/webdriver/#set-window-rect}
   *
   * @param x - the screen coordinate for the new left edge of the window
   * @param y - the screen coordinate for the new top edge of the window
   * @param width - the width in pixels to resize the window to
   * @param height - the height in pixels to resize the window to
   *
   * @returns The actual `Rect` of the window after running the command
   */
  setWindowRect?(x: number, y: number, width: number, height: number): Promise<Rect>;

  /**
   * Run the window-manager specific 'maximize' operation on the current window
   * @see {@link https://w3c.github.io/webdriver/#maximize-window}
   *
   * @returns The actual `Rect` of the window after running the command
   */
  maximizeWindow?(): Promise<Rect>;

  /**
   * Run the window-manager specific 'minimize' operation on the current window
   * @see {@link https://w3c.github.io/webdriver/#minimize-window}
   *
   * @returns The actual `Rect` of the window after running the command
   */
  minimizeWindow?(): Promise<Rect>;

  /**
   * Put the current window into full screen mode
   * @see {@link https://w3c.github.io/webdriver/#fullscreen-window}
   *
   * @returns The actual `Rect` of the window after running the command
   */
  fullScreenWindow?(): Promise<Rect>;

  /**
   * Get the active element
   * @see {@link https://w3c.github.io/webdriver/#get-active-element}
   *
   * @returns The JSON object encapsulating the active element reference
   */
  active?(): Promise<Element>;

  /**
   * Get the shadow root of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-shadow-root}
   *
   * @param elementId - the id of the element to retrieve the shadow root for
   *
   * @returns The shadow root for an element, as an element
   */
  elementShadowRoot?(elementId: string): Promise<Element>;

  /**
   * Determine if the reference element is selected or not
   * @see {@link https://w3c.github.io/webdriver/#is-element-selected}
   *
   * @param elementId - the id of the element
   *
   * @returns True if the element is selected, False otherwise
   */
  elementSelected?(elementId: string): Promise<boolean>;

  /**
   * Retrieve the value of an element's attribute
   * @see {@link https://w3c.github.io/webdriver/#get-element-attribute}
   *
   * @param name - the attribute name
   * @param elementId - the id of the element
   *
   * @returns The attribute value
   */
  getAttribute?(name: string, elementId: string): Promise<string | null>;

  /**
   * Retrieve the value of a named property of an element's JS object
   * @see {@link https://w3c.github.io/webdriver/#get-element-property}
   *
   * @param name - the object property name
   * @param elementId - the id of the element
   *
   * @returns The property value
   */
  getProperty?(name: string, elementId: string): Promise<string | null>;

  /**
   * Retrieve the value of a CSS property of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-css-value}
   *
   * @param name - the CSS property name
   * @param elementId - the id of the element
   *
   * @returns The property value
   */
  getCssProperty?(name: string, elementId: string): Promise<string>;

  /**
   * Get the text of an element as rendered
   * @see {@link https://w3c.github.io/webdriver/#get-element-text}
   *
   * @param elementId - the id of the element
   *
   * @returns The text rendered for the element
   */
  getText?(elementId: string): Promise<string>;

  /**
   * Get the tag name of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-tag-name}
   *
   * @param elementId - the id of the element
   *
   * @returns The tag name
   */
  getName?(elementId: string): Promise<string>;

  /**
   * Get the dimensions and position of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-rect}
   *
   * @param elementId - the id of the element
   *
   * @returns The Rect object containing x, y, width, and height properties
   */
  getElementRect?(elementId: string): Promise<Rect>;

  /**
   * Determine whether an element is enabled
   * @see {@link https://w3c.github.io/webdriver/#is-element-enabled}
   *
   * @param elementId - the id of the element
   *
   * @returns True if the element is enabled, False otherwise
   */
  elementEnabled?(elementId: string): Promise<boolean>;

  /**
   * Get the WAI-ARIA role of an element
   * @see {@link https://w3c.github.io/webdriver/#get-computed-role}
   *
   * @param elementId - the id of the element
   *
   * @returns The role
   */
  getComputedRole?(elementId: string): Promise<string | null>;

  /**
   * Get the accessible name/label of an element
   * @see {@link https://w3c.github.io/webdriver/#get-computed-label}
   *
   * @param elementId - the id of the element
   *
   * @returns The accessible name
   */
  getComputedLabel?(elementId: string): Promise<string | null>;

  /**
   * Determine whether an element is displayed
   * @see {@link https://w3c.github.io/webdriver/#element-displayedness}
   *
   * @param elementId - the id of the element
   *
   * @returns True if any part of the element is rendered within the viewport, False otherwise
   */
  elementDisplayed?(elementId: string): Promise<boolean>;

  /**
   * Click/tap an element
   * @see {@link https://w3c.github.io/webdriver/#element-click}
   *
   * @param elementId - the id of the element
   */
  click?(elementId: string): Promise<void>;

  /**
   * Clear the text/value of an editable element
   * @see {@link https://w3c.github.io/webdriver/#element-clear}
   *
   * @param elementId - the id of the element
   */
  clear?(elementId: string): Promise<void>;

  /**
   * Send keystrokes to an element (or otherwise set its value)
   * @see {@link https://w3c.github.io/webdriver/#element-send-keys}
   *
   * @param text - the text to send to the element
   * @param elementId - the id of the element
   */
  setValue?(text: string, elementId: string): Promise<void>;

  /**
   * Execute JavaScript (or some other kind of script) in the browser/app context
   * @see {@link https://w3c.github.io/webdriver/#execute-script}
   *
   * @param script - the string to be evaluated as the script, which will be made the body of an
   * anonymous function in the case of JS
   * @param args - the list of arguments to be applied to the script as a function
   *
   * @returns The return value of the script execution
   */
  execute?(script: string, args: unknown[]): Promise<unknown>;

  /**
   * Execute JavaScript (or some other kind of script) in the browser/app context, asynchronously
   * @see {@link https://w3c.github.io/webdriver/#execute-async-script}
   *
   * @param script - the string to be evaluated as the script, which will be made the body of an
   * anonymous function in the case of JS
   * @param args - the list of arguments to be applied to the script as a function
   *
   * @returns The promise resolution of the return value of the script execution (or an error
   * object if the promise is rejected)
   */
  executeAsync?(script: string, args: unknown[]): Promise<unknown>;

  /**
   * Get all cookies known to the browsing context
   * @see {@link https://w3c.github.io/webdriver/#get-all-cookies}
   *
   * @returns A list of serialized cookies
   */
  getCookies?(): Promise<Cookie[]>;

  /**
   * Get a cookie by name
   * @see {@link https://w3c.github.io/webdriver/#get-named-cookie}
   *
   * @param name - the name of the cookie
   *
   * @returns A serialized cookie
   */
  getCookie?(name: string): Promise<Cookie>;

  /**
   * Add a cookie to the browsing context
   * @see {@link https://w3c.github.io/webdriver/#add-cookie}
   *
   * @param cookie - the cookie data including properties like name, value, path, domain,
   * secure, httpOnly, expiry, and samesite
   */
  setCookie?(cookie: Cookie): Promise<void>;

  /**
   * Delete a named cookie
   * @see {@link https://w3c.github.io/webdriver/#delete-cookie}
   *
   * @param name - the name of the cookie to delete
   */
  deleteCookie?(name: string): Promise<void>;

  /**
   * Delete all cookies
   * @see {@link https://w3c.github.io/webdriver/#delete-all-cookies}
   */
  deleteCookies?(): Promise<void>;

  /**
   * Perform touch or keyboard actions
   * @see {@link https://w3c.github.io/webdriver/#perform-actions}
   *
   * @param actions - the action sequence
   */
  performActions?(actions: ActionSequence[]): Promise<void>;

  /**
   * Release all keys or buttons that are currently pressed
   * @see {@link https://w3c.github.io/webdriver/#release-actions}
   */
  releaseActions?(): Promise<void>;

  /**
   * Dismiss a simple dialog/alert
   * @see {@link https://w3c.github.io/webdriver/#dismiss-alert}
   */
  postDismissAlert?(): Promise<void>;

  /**
   * Accept a simple dialog/alert
   * @see {@link https://w3c.github.io/webdriver/#accept-alert}
   */
  postAcceptAlert?(): Promise<void>;

  /**
   * Get the text of the displayed alert
   * @see {@link https://w3c.github.io/webdriver/#get-alert-text}
   *
   * @returns The text of the alert
   */
  getAlertText?(): Promise<string | null>;

  /**
   * Set the text field of an alert prompt
   * @see {@link https://w3c.github.io/webdriver/#send-alert-text}
   *
   * @param text - the text to send to the prompt
   */
  setAlertText?(text: string): Promise<void>;

  /**
   * Get a screenshot of the current document as rendered
   * @see {@link https://w3c.github.io/webdriver/#take-screenshot}
   *
   * @returns A base64-encoded string representing the PNG image data
   */
  getScreenshot?(): Promise<string>;

  /**
   * Get an image of a single element as rendered on screen
   * @see {@link https://w3c.github.io/webdriver/#take-element-screenshot}
   *
   * @param elementId - the id of the element
   *
   * @returns A base64-encoded string representing the PNG image data for the element rect
   */
  getElementScreenshot?(elementId: string): Promise<string>;

  /**
   * Print the page by rendering it as a PDF document
   * @see {@link https://w3c.github.io/webdriver/#print-page}
   *
   * @param orientation - the orientation of the page ("portrait" or "landscape")
   * @param scale - the page scale, between 0.1 and 2
   * @param background - whether to include background images
   * @param page - the width and height of the printed page
   * @param margin - the margins of the printed page
   * @param shrinkToFit - whether to resize page contents to match {@linkcode PrintPageSize.width}
   * @param pageRanges - array of page numbers and/or page ranges (dash-separated strings) to be printed
   *
   * @returns A base64-encoded string representing the PDF document
   */
  printPage?(
    orientation?: string,
    scale?: number,
    background?: boolean,
    page?: PrintPageSize,
    margin?: PrintPageMargins,
    shrinkToFit?: boolean,
    pageRanges?: (number | string)[]
  ): Promise<string>;
}

export type NewWindowType = 'tab' | 'window';

export interface NewWindow {
  handle: string;
  type: NewWindowType;
}

// WebDriver
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// JSONWP
export type Size = Pick<Rect, 'width' | 'height'>;

// JSONWP
export type Position = Pick<Rect, 'x' | 'y'>;

export interface Cookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expiry?: number;
  sameSite?: 'Lax' | 'Strict';
}

export interface PrintPageSize {
  width?: number;
  height?: number;
}

export interface PrintPageMargins {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}
