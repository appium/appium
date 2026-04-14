/* eslint-disable no-console */

import ora from 'ora';

export const JSON_SPACES = 4;

type ErrorLike = Error & {stderr?: unknown};

export class RingBuffer<T = any> {
  private readonly size: number;
  private readonly buffer: T[] = [];

  constructor(size = 50) {
    this.size = size;
  }

  /**
   * Get the current buffer contents.
   */
  getBuff(): T[] {
    return this.buffer;
  }

  /**
   * Add an item to the buffer.
   */
  enqueue(item: T): void {
    if (this.buffer.length >= this.size) {
      this.dequeue();
    }
    this.buffer.push(item);
  }

  /**
   * Remove the oldest item from the buffer.
   */
  dequeue(): void {
    this.buffer.shift();
  }
}

/**
 * Log an error to the console and exit the process.
 *
 * @param json - whether we should log json or text
 * @param msg - error message, object, Error instance, etc.
 */
export function errAndQuit(json: boolean, msg: unknown): never {
  if (json) {
    console.log(JSON.stringify({error: String(msg)}, null, JSON_SPACES));
  } else {
    console.error((String(msg) as any).red);
    if ((msg as ErrorLike)?.stderr) {
      console.error((String((msg as ErrorLike).stderr) as any).red);
    }
  }
  process.exit(1);
}

/**
 * Conditionally log something to the console.
 *
 * @param json - whether we are in json mode (and should therefore not log)
 * @param msg - string to log
 */
export function log(json: boolean, msg: string): void {
  if (!json) {
    console.log(msg);
  }
}

/**
 * Start a spinner, execute an async function, and then stop the spinner.
 *
 * @param json - whether we are in json mode (and should therefore not log)
 * @param msg - string to log
 * @param fn - function to wrap with spinning
 * @returns result of `fn`
 */
export async function spinWith<T>(
  json: boolean,
  msg: string,
  fn: () => T | Promise<T>
): Promise<T> {
  if (json) {
    return await fn();
  }
  const spinner = ora(msg).start();
  try {
    const res = await fn();
    spinner.succeed();
    return res;
  } catch (err) {
    spinner.fail();
    throw err;
  }
}
