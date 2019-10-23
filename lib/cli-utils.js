/* eslint-disable no-console */

function errAndQuit (json, msg) {
  if (json) {
    console.log(JSON.stringify({error: msg.toString()}));
  } else {
    console.error(msg.toString().red);
  }
  process.exit(1);
}

function log (json, msg) {
  !json && console.log(msg);
}

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

function logSpin (json, msg) {
  if (json) {
    return () => {};
  }

  return startSpinner(msg);
}

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
  logSpin
};
