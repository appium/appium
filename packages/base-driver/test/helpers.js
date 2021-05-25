import getPort from 'get-port';

const TEST_HOST = '127.0.0.1';

let TEST_PORT;
/**
 * Returns a free port; one per process
 * @param {boolean} [force] - If true, do not reuse the port (if it already exists)
 * @returns {Promise<number>} a free port
 */
async function getTestPort (force = false) {
  return await (force || !TEST_PORT ? getPort() : TEST_PORT);
}

export { TEST_HOST, getTestPort };
