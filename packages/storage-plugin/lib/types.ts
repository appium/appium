export interface ItemOptions {
  /** Destination file name */
  name: string;
  /** SHA1 hash of the file */
  sha1: string;
}

export interface StorageItem {
  /** Item name */
  name: string;
  /** Full path to the item on the server FS */
  path: string;
  /** Item size in bytes */
  size: number;
}

export interface WsEndpoints {
  /** Websocket pathname used to upload file chunks */
  stream: string;
  /** Websocket pathname used to deliver events to the client */
  events: string;
}

export interface AddRequestResult {
  /** The websocket pathname where the further upload is expected */
  ws: WsEndpoints;
  /** For how long the websocket server is going to be alive in milliseconds */
  ttlMs: number;
}
