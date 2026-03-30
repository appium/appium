import _ from 'lodash';

const NS_PER_S = 1e9;
const NS_PER_MS = 1e6;

/** High-resolution start time: tuple from process.hrtime() or bigint from process.hrtime.bigint() */
type HrTime = [number, number] | bigint;

/**
 * Class representing a duration, encapsulating the number and units.
 */
export class Duration {
  constructor(private _nanos: number) {}

  get nanos(): number {
    return this._nanos;
  }

  /**
   * Get the duration as nanoseconds
   *
   * @returns {number} The duration as nanoseconds
   */
  get asNanoSeconds(): number {
    return this.nanos;
  }

  /**
   * Get the duration converted into milliseconds
   *
   * @returns {number} The duration as milliseconds
   */
  get asMilliSeconds(): number {
    return this.nanos / NS_PER_MS;
  }

  /**
   * Get the duration converted into seconds
   *
   * @returns {number} The duration fas seconds
   */
  get asSeconds(): number {
    return this.nanos / NS_PER_S;
  }

  toString(): string {
    // default to milliseconds, rounded
    return this.asMilliSeconds.toFixed(0);
  }
}

export class Timer {
  /**
   * Creates a timer
   */
  constructor(private _startTime: HrTime | null = null) {}

  get startTime(): HrTime | null {
    return this._startTime;
  }

  /**
   * Start the timer
   *
   * @return {Timer} The current instance, for chaining
   */
  start(): this {
    if (!_.isNull(this._startTime)) {
      throw new Error('Timer has already been started.');
    }
    this._startTime = process.hrtime.bigint();
    return this;
  }

  /**
   * Get the duration since the timer was started
   *
   * @return {Duration} the duration
   */
  getDuration(): Duration {
    if (_.isNull(this._startTime)) {
      throw new Error('Unable to get duration. Timer was not started');
    }

    let nanoDuration: number;
    if (_.isArray(this._startTime)) {
      // startTime was created using process.hrtime()
      const [seconds, nanos] = process.hrtime(this._startTime as [number, number]);
      nanoDuration = seconds * NS_PER_S + nanos;
    } else if (typeof this._startTime === 'bigint') {
      // startTime was created using process.hrtime.bigint()
      const endTime = process.hrtime.bigint();
      // get the difference, and convert to number
      nanoDuration = Number(endTime - this._startTime);
    } else {
      throw new Error(`Unable to get duration. Start time '${this._startTime}' cannot be parsed`);
    }

    return new Duration(nanoDuration);
  }

  toString(): string {
    try {
      return this.getDuration().toString();
    } catch (err) {
      return `<err: ${(err as Error).message}>`;
    }
  }
}

export {Timer as default};
