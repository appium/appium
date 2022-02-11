// transpile:main

import * as driver from './driver';
import * as server from './server';

const { FakeDriver } = driver;
const { startServer } = server;

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 4774;

async function main () {
  const getArgValue = (argName) => {
    const argIndex = process.argv.indexOf(argName);
    return argIndex > 0 ? process.argv[argIndex + 1] : null;
  };
  const port = parseInt(getArgValue('--port'), 10) || DEFAULT_PORT;
  const host = getArgValue('--host') || DEFAULT_HOST;
  return await startServer(port, host);
}

export { FakeDriver, startServer, main };
