import {readFileSync} from 'fs';
import {logger} from '@appium/support';

const log = logger.getLogger('Appium');

class SslHandler {
  constructor() {
    this.secure = false;
    this.httpsOptions = {};
  }

  static getInstance() {
    if (this.instance == null) {
      this.instance = new SslHandler();
      this.instance.handleHttpsOptions();
    }
    return this.instance;
  }

  get secure() {
    return this._secure;
  }

  set secure(value) {
    this._secure = value;
  }

  get httpsOptions() {
    return this._httpsOptions;
  }

  set httpsOptions(value) {
    this._httpsOptions = value;
  }

  /**
   * if ENV 'APPIUM_SECURE' is set to 'true'
   * and both 'ENV APPIUM_SSL_CERT_PATH' and 'APPIUM_SSL_KEY_PATH' contain valid paths
   * @returns {JSON} Returns 'httpsOptions' metadata otherwise empty
   */
  handleHttpsOptions() {
    const secure = process.env.APPIUM_SECURE;
    if (secure === 'true') {
      log.info(`SSL mode detected as ENV 'APPIUM_SECURE' is set to 'true'`);
      const certPath = process.env.APPIUM_SSL_CERT_PATH;
      const keyPath = process.env.APPIUM_SSL_KEY_PATH;
      if (certPath === undefined) {
        throw new Error(
          `ENV 'APPIUM_SSL_CERT_PATH' must be set when ENV 'APPIUM_SECURE' is set to 'true'!`
        );
      }
      log.info(`ENV 'APPIUM_SSL_CERT_PATH' is set to '${certPath}'`);
      if (keyPath === undefined) {
        throw new Error(
          `ENV 'APPIUM_SSL_KEY_PATH' must be set when ENV 'APPIUM_SECURE' is set to 'true'!`
        );
      }
      log.info(`ENV 'APPIUM_SSL_KEY_PATH' is set to '${keyPath}'`);
      this.httpsOptions = {cert: readFileSync(certPath), key: readFileSync(keyPath)};
      this.secure = true;
    }
    return this.httpsOptions;
  }
}

export {SslHandler};
