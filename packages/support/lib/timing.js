import _ from 'lodash';


const NS_PER_S = 1e9;
const NS_PER_MS = 1e6;


/**
 * Class representing a duration, encapsulating the number and units.
 */
class Duration {
  constructor (nanos) {
    this._nanos = nanos;
  }

  get nanos () {
    return this._nanos;
  }

  /**
   * Get the duration as nanoseconds
   *
   * @returns {number} The duration as nanoseconds
   */
  get asNanoSeconds () {
    return this.nanos;
  }

  /**
   * Get the duration converted into milliseconds
   *
   * @returns {number} The duration as milliseconds
   */
  get asMilliSeconds () {
    return this.nanos / NS_PER_MS;
  }

  /**
   * Get the duration converted into seconds
   *
   * @returns {number} The duration fas seconds
   */
  get asSeconds () {
    return this.nanos / NS_PER_S;
  }

  toString () {
    // default to milliseconds, rounded
    return this.asMilliSeconds.toFixed(0);
  }
}

class Timer {
  /**
   * Creates a timer
   */
  constructor () {
    this._startTime = null;
  }

  get startTime () {
    return this._startTime;
  }

  /**
   * Start the timer
   *
   * @return {Timer} The current instance, for chaining
   */
  start () {
    if (!_.isNull(this.startTime)) {
      throw new Error('Timer has already been started.');
    }
    // once Node 10 is no longer supported, this check can be removed
    this._startTime = _.isFunction(process.hrtime.bigint)
      ? process.hrtime.bigint()
      : process.hrtime();
    return this;
  }

  /**
   * Get the duration since the timer was started
   *
   * @return {Duration} the duration
   */
  getDuration () {
    if (_.isNull(this.startTime)) {
      throw new Error(`Unable to get duration. Timer was not started`);
    }

    let nanoDuration;
    if (_.isArray(this.startTime)) {
      // startTime was created using process.hrtime()
      const [seconds, nanos] = process.hrtime(this.startTime);
      nanoDuration = seconds * NS_PER_S + nanos;
    } else if (typeof this.startTime === 'bigint' && _.isFunction(process.hrtime.bigint)) {
      // startTime was created using process.hrtime.bigint()
      const endTime = process.hrtime.bigint();
      // get the difference, and convert to number
      nanoDuration = Number(endTime - this.startTime);
    } else {
      throw new Error(`Unable to get duration. Start time '${this.startTime}' cannot be parsed`);
    }

    return new Duration(nanoDuration);
  }

  toString () {
    try {
      return this.getDuration().toString();
    } catch (err) {
      return `<err: ${err.message}>`;
    }
  }
}


export { Timer, Duration };
export default Timer;
