import {EventEmitter} from 'node:events';
import rewiremock, {addPlugin, overrideEntryPoint, plugins} from 'rewiremock';

overrideEntryPoint(module);
addPlugin(plugins.nodejs);

class MockReadWriteStream extends EventEmitter {
  resume() {}

  pause() {}

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
