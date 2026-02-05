import sinon from 'sinon';
import _ from 'lodash';
import {logger} from '../../../lib';

let sandbox: sinon.SinonSandbox;

export function setupWriters() {
  sandbox = sinon.createSandbox();
  return {
    stdout: sandbox.spy(process.stdout, 'write'),
    stderr: sandbox.spy(process.stderr, 'write'),
  };
}

export function getDynamicLogger(
  testingMode: boolean,
  forceLogs: boolean,
  prefix: string | (() => string) | null = null
) {
  process.env._TESTING = testingMode ? '1' : '0';
  process.env._FORCE_LOGS = forceLogs ? '1' : '0';
  return logger.getLogger(prefix);
}

/** Restore stubs; signature kept for API compatibility with callers that pass writers. */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function restoreWriters(writers: ReturnType<typeof setupWriters>) {
  sandbox.restore();
}

function someoneHadOutput(writers: ReturnType<typeof setupWriters>, output: string) {
  let hadOutput = false;
  const matchOutput = sinon.match(function (value: string) {
    return !!(value && value.indexOf(output) >= 0);
  }, 'matchOutput');

  for (const writer of _.values(writers)) {
    if (writer.calledWithMatch) {
      hadOutput = writer.calledWithMatch(matchOutput);
      if (hadOutput) {
        break;
      }
    }
  }
  return hadOutput;
}

export function assertOutputContains(writers: ReturnType<typeof setupWriters>, output: string) {
  if (!someoneHadOutput(writers, output)) {
    throw new Error(`Expected something to have been called with: '${output}'`);
  }
}

export function assertOutputDoesntContain(writers: ReturnType<typeof setupWriters>, output: string) {
  if (someoneHadOutput(writers, output)) {
    throw new Error(`Expected nothing to have been called with: '${output}'`);
  }
}
