/**
 * Runs a bounded number of jobs concurrently. The first failure is remembered
 * and rethrown by the next `submit` or `drain`, already running jobs are not interrupted.
 */
export class WriteQueue {
  private readonly maxJobs: number;
  private readonly maxBytes: number;
  private readonly running = new Set<Promise<boolean>>();
  private readonly runningKeys = new Set<string>();
  private runningBytes = 0;
  private failure: {error: unknown} | null = null;
  private rejectFailed!: (error: unknown) => void;

  /** Rejects as soon as a job fails, to interrupt whatever else is being waited for. It never fulfils. */
  readonly failed: Promise<never>;

  /**
   * @param maxJobs The maximum number of jobs running at the same time
   * @param maxBytes The maximum total size of the data held by running jobs
   */
  constructor(maxJobs: number, maxBytes: number) {
    this.maxJobs = Math.max(1, maxJobs);
    this.maxBytes = maxBytes;
    this.failed = new Promise<never>((_resolve, reject) => {
      this.rejectFailed = reject;
    });
    // The failure is reported to those who wait for it, and by submit and drain
    // oxlint-disable-next-line promise/prefer-await-to-then -- only marks the rejection as handled
    this.failed.catch(() => {});
  }

  /**
   * Starts the job as soon as there is capacity. Jobs with the same key never overlap.
   *
   * @param key Identifies the resource the job touches
   * @param bytes The amount of memory the job keeps
   * @param job The work
   * @throws {unknown} The failure of any previously submitted job
   */
  async submit(key: string, bytes: number, job: () => Promise<void>): Promise<void> {
    this.throwIfFailed();
    await this.waitForKey(key);
    while (this.running.size >= this.maxJobs || (this.running.size > 0 && this.runningBytes + bytes > this.maxBytes)) {
      await Promise.race(this.running);
      this.throwIfFailed();
    }

    this.runningKeys.add(key);
    this.runningBytes += bytes;
    // oxlint-disable-next-line promise/prefer-await-to-then -- the task must remove itself from the set
    const task: Promise<boolean> = this.execute(key, bytes, job).then(() => this.running.delete(task));
    this.running.add(task);
  }

  /** Waits until no job with this key is running. */
  async waitForKey(key: string): Promise<void> {
    while (this.runningKeys.has(key)) {
      await Promise.race(this.running);
      this.throwIfFailed();
    }
  }

  /**
   * Waits for all jobs.
   *
   * @throws {unknown} The first failure of any job
   */
  async drain(): Promise<void> {
    await this.settle();
    this.throwIfFailed();
  }

  /** Waits for all jobs without reporting failures. */
  async settle(): Promise<void> {
    while (this.running.size > 0) {
      await Promise.all(this.running);
    }
  }

  /** Runs the job, remembers its failure and releases the resources it holds. Never rejects. */
  private async execute(key: string, bytes: number, job: () => Promise<void>): Promise<void> {
    try {
      await job();
    } catch (error) {
      if (!this.failure) {
        this.failure = {error};
        this.rejectFailed(error);
      }
    } finally {
      this.runningKeys.delete(key);
      this.runningBytes -= bytes;
    }
  }

  private throwIfFailed(): void {
    if (this.failure) {
      throw this.failure.error;
    }
  }
}
