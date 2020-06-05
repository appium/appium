/* eslint-disable no-console */

const JSON_SPACES = 4;

/***
 * Log an error to the console and exit the process.
 * @param {boolean} json - whether we should log json or text
 * @param {string} msg - error message
 */
function errAndQuit (json, msg) {
  if (json) {
    console.log(JSON.stringify({error: `${msg}`}), null, JSON_SPACES);
  } else {
    console.error(`${msg}`.red);
  }
  process.exit(1);
}

/**
 * Conditionally log something to the console
 * @param {boolean} json - whether we are in json mode (and should therefore not log)
 * @param {string} msg - string to log
 */
function log (json, msg) {
  !json && console.log(msg);
}

/**
 * Start a CLI spinner
 * @param {string} msg - what to label the spinner with
 */
function startSpinner (msg) {
  process.stdout.write(msg);

  let count = 1;
  const numDots = 5;
  const dotTime = 500;
  const cursorStart = msg.length;

  const interval = setInterval(() => {
    if (count % (numDots + 1) === 0) {
      process.stdout.cursorTo(cursorStart);
      for (let i = 0; i < numDots; i++) {
        process.stdout.write(' ');
      }
      process.stdout.cursorTo(cursorStart);
    } else {
      process.stdout.write('.');
    }
    count++;
  }, dotTime);

  return () => {
    clearInterval(interval);
    process.stdout.write('\n');
  };
}

/**
 * Conditionally start a spinner
 * @param {boolean} json - whether we are in json mode (and should therefore not log)
 * @param {string} msg - string to log
 */
function logSpin (json, msg) {
  if (json) {
    return () => {};
  }

  return startSpinner(msg);
}

/**
 * Start a spinner, execute an async function, and then stop the spinner
 * @param {boolean} json - whether we are in json mode (and should therefore not log)
 * @param {string} msg - string to log
 * @param {function} fn - function to wrap with spinning
 */
async function spinWith (json, msg, fn) {
  const stopSpinner = logSpin(json, msg);
  let res;
  try {
    res = await fn();
  } finally {
    stopSpinner();
  }
  return res;
}

export {
  errAndQuit,
  log,
  startSpinner,
  spinWith,
  logSpin,
  JSON_SPACES
};
