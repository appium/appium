import {EventEmitter} from 'node:events';
import rewiremock, {addPlugin, overrideEntryPoint, plugins} from 'rewiremock';

overrideEntryPoint(module);
addPlugin(plugins.nodejs);

class MockReadWriteStream extends EventEmitter {
  resume() {}

  pause() {}

  // Signature required by stream interface; encoding not used in mock.
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  setEncoding(_encoding?: string) {}

  flush() {}

  write(msg: string | Buffer) {
    this.emit('data', msg);
  }

  end() {
    this.emit('end');
    this.emit('finish');
  }
}

export {MockReadWriteStream, rewiremock};
