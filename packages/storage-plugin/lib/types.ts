export interface FileChunkOpts {
  /** Destination file name */
  name: string;
  /** SHA1 hash of the file */
  hash: string;
  /** Total file size */
  size: number;
  /** Base64-encoded file chunk as a string. Must not be greater than 64KB */
  chunk: string;
  /** Start byte number of the chunk in the original file */
  position: number;
}
