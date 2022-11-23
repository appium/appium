import {FakeDriver} from './driver';
import {startServer} from './server';

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 4774;

async function main() {
  const getArgValue = (/** @type {string} */ argName) => {
    const argIndex = process.argv.indexOf(argName);
    return argIndex > 0 ? process.argv[argIndex + 1] : null;
  };
  const port = parseInt(String(getArgValue('--port')), 10) || DEFAULT_PORT;
  const host = getArgValue('--host') || DEFAULT_HOST;
  return await startServer(port, host);
}

export {FakeDriver, startServer, main};
