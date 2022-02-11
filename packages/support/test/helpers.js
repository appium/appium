import { EventEmitter } from 'events';
import rewiremock, {addPlugin, overrideEntryPoint, plugins} from 'rewiremock';

overrideEntryPoint(module);
addPlugin(plugins.nodejs);
addPlugin(plugins.childOnly);
class MockReadWriteStream extends EventEmitter {
  resume () {}

  pause () {}

  setEncoding () {}

  flush () {}

  write (msg) {
    this.emit('data', msg);
  }

  end () {
    this.emit('end');
    this.emit('finish');
  }
}

export { MockReadWriteStream, rewiremock };
