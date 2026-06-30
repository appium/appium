type BlockingStream = NodeJS.WriteStream & {
  _handle?: { setBlocking?: (value: boolean) => void };
};

const DEFAULT_STREAMS: BlockingStream[] = [process.stdout, process.stderr];

/**
 * Enable or disable blocking mode for stdio streams.
 * @param blocking Whether stdio should block on write.
 * @param streams Streams to configure (defaults to stdout and stderr).
 */
export function setBlocking(blocking: boolean, streams: readonly BlockingStream[] = DEFAULT_STREAMS): void {
  for (const stream of streams) {
    const handle = stream._handle;
    if (handle && stream.isTTY && typeof handle.setBlocking === 'function') {
      handle.setBlocking(blocking);
    }
  }
}
