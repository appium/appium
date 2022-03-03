import sinon from 'sinon';
import _ from 'lodash';
import { logger } from '../../lib';


let sandbox;

function setupWriters () {
  sandbox = sinon.createSandbox();
  return {
    stdout: sandbox.spy(process.stdout, 'write'),
    stderr: sandbox.spy(process.stderr, 'write')
  };
}

function getDynamicLogger (testingMode, forceLogs, prefix = null) {
  process.env._TESTING = testingMode ? '1' : '0';
  process.env._FORCE_LOGS = forceLogs ? '1' : '0';
  return logger.getLogger(prefix);
}

function restoreWriters () {
  sandbox.restore();
}

function someoneHadOutput (writers, output) {
  let hadOutput = false;
  let matchOutput = sinon.match(function (value) {
    return value && value.indexOf(output) >= 0;
  }, 'matchOutput');

  for (let writer of _.values(writers)) {
    if (writer.calledWith) {
      hadOutput = writer.calledWithMatch(matchOutput);
      if (hadOutput) break; // eslint-disable-line curly
    }
  }
  return hadOutput;
}

function assertOutputContains (writers, output) {
  if (!someoneHadOutput(writers, output)) {
    throw new Error(`Expected something to have been called with: '${output}'`);
  }
}

function assertOutputDoesntContain (writers, output) {
  if (someoneHadOutput(writers, output)) {
    throw new Error(`Expected nothing to have been called with: '${output}'`);
  }
}

export {
  setupWriters, restoreWriters, assertOutputContains, assertOutputDoesntContain,
  getDynamicLogger,
};
