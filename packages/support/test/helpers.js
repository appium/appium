import { EventEmitter } from 'events';

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

export { MockReadWriteStream };
