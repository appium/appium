export interface FileChunkOptions {
  /** Destination file name */
  name: string;
  /** SHA1 hash of the file */
  hash: string;
  /** Total file size */
  size: number;
  /** Start byte number of the chunk in the original file */
  position: number;
  /** Base64-encoded file chunk as a string. Must not be greater than 64KB */
  chunk: string;
}

export interface StorageItem {
  /** Item name */
  name: string;
  /** Full path to the item on the server FS */
  path: string;
  /** Item size in bytes */
  size: number;
}
