/* eslint-disable no-console */
import { Log } from '../../lib/log';
import { unleakString } from '../../lib/utils';
import {Stream} from 'node:stream';

describe('basic', function () {
  let chai;
  let log;

  before(async function () {
    chai = await import('chai');
    chai.should();
  });

  describe('logging', function () {
    let s;
    let result = [];
    let logEvents = [];
    let logInfoEvents = [];
    let logPrefixEvents = [];
    const resultExpect = [

      '\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[7msill\u001b[0m \u001b[0m\u001b[35msilly prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[36;40mverb\u001b[0m \u001b[0m\u001b[35mverbose prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[32minfo\u001b[0m \u001b[0m\u001b[35minfo prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[32;40mtiming\u001b[0m \u001b[0m\u001b[35mtiming prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[32;40mhttp\u001b[0m \u001b[0m\u001b[35mhttp prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[36;40mnotice\u001b[0m \u001b[0m\u001b[35mnotice prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[30;43mWARN\u001b[0m \u001b[0m\u001b[35mwarn prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[31;40mERR!\u001b[0m \u001b[0m\u001b[35merror prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[32minfo\u001b[0m \u001b[0m\u001b[35minfo prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[32;40mtiming\u001b[0m \u001b[0m\u001b[35mtiming prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[32;40mhttp\u001b[0m \u001b[0m\u001b[35mhttp prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[36;40mnotice\u001b[0m \u001b[0m\u001b[35mnotice prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[30;43mWARN\u001b[0m \u001b[0m\u001b[35mwarn prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[31;40mERR!\u001b[0m \u001b[0m\u001b[35merror prefix\u001b[0m x = {"foo":{"bar":"baz"}}\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[31;40mERR!\u001b[0m \u001b[0m\u001b[35m404\u001b[0m This is a longer\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[31;40mERR!\u001b[0m \u001b[0m\u001b[35m404\u001b[0m message, with some details\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[31;40mERR!\u001b[0m \u001b[0m\u001b[35m404\u001b[0m and maybe a stack.\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u001b[31;40mERR!\u001b[0m \u001b[0m\u001b[35m404\u001b[0m \n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u0007noise\u001b[0m\u001b[35m\u001b[0m LOUD NOISES\n',

      '\u001b[0m\u001b[37;40mnpm\u001b[0m \u001b[0m\u0007noise\u001b[0m \u001b[0m\u001b[35merror\u001b[0m erroring\n',
      '\u001b[0m',
    ];
    const logPrefixEventsExpect = [
      { id: 2,
        level: 'info',
        prefix: 'info prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 11,
        level: 'info',
        prefix: 'info prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 20,
        level: 'info',
        prefix: 'info prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
    ];
    // should be the same.
    const logInfoEventsExpect = logPrefixEventsExpect;
    const logEventsExpect = [
      { id: 0,
        level: 'silly',
        prefix: 'silly prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 1,
        level: 'verbose',
        prefix: 'verbose prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 2,
        level: 'info',
        prefix: 'info prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 3,
        level: 'timing',
        prefix: 'timing prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 4,
        level: 'http',
        prefix: 'http prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 5,
        level: 'notice',
        prefix: 'notice prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 6,
        level: 'warn',
        prefix: 'warn prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 7,
        level: 'error',
        prefix: 'error prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 8,
        level: 'silent',
        prefix: 'silent prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 9,
        level: 'silly',
        prefix: 'silly prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 10,
        level: 'verbose',
        prefix: 'verbose prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 11,
        level: 'info',
        prefix: 'info prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 12,
        level: 'timing',
        prefix: 'timing prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 13,
        level: 'http',
        prefix: 'http prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 14,
        level: 'notice',
        prefix: 'notice prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 15,
        level: 'warn',
        prefix: 'warn prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 16,
        level: 'error',
        prefix: 'error prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 17,
        level: 'silent',
        prefix: 'silent prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 18,
        level: 'silly',
        prefix: 'silly prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 19,
        level: 'verbose',
        prefix: 'verbose prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 20,
        level: 'info',
        prefix: 'info prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 21,
        level: 'timing',
        prefix: 'timing prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 22,
        level: 'http',
        prefix: 'http prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 23,
        level: 'notice',
        prefix: 'notice prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 24,
        level: 'warn',
        prefix: 'warn prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 25,
        level: 'error',
        prefix: 'error prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 26,
        level: 'silent',
        prefix: 'silent prefix',
        message: 'x = {"foo":{"bar":"baz"}}',
      },
      { id: 27,
        level: 'error',
        prefix: '404',
        message: 'This is a longer\nmessage, with some details\nand maybe a stack.\n',
      },
      { id: 28,
        level: 'noise',
        prefix: '',
        message: 'LOUD NOISES',
      },
      { id: 29,
        level: 'noise',
        prefix: 'error',
        message: 'erroring',
      },
    ];

    beforeEach(function () {
      result = [];
      logEvents = [];
      logInfoEvents = [];
      logPrefixEvents = [];

      log = new Log();
      s = new Stream();
      s.write = (m) => result.push(m);
      s.writable = true;
      s.isTTY = true;
      s.end = () => {};
      log.stream = s;
      log.heading = 'npm';
    });

    it('should work', function () {
      log.stream.should.equal(s);
      log.on('log', logEvents.push.bind(logEvents));
      log.on('log.info', logInfoEvents.push.bind(logInfoEvents));
      log.on('info prefix', logPrefixEvents.push.bind(logPrefixEvents));

      console.error('log.level=silly');
      log.level = 'silly';
      log.silly('silly prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.verbose('verbose prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.info('info prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.timing('timing prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.http('http prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.notice('notice prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.warn('warn prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.error('error prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.silent('silent prefix', 'x = %j', { foo: { bar: 'baz' } });

      console.error('log.level=silent');
      log.level = 'silent';
      log.silly('silly prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.verbose('verbose prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.info('info prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.timing('timing prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.http('http prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.notice('notice prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.warn('warn prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.error('error prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.silent('silent prefix', 'x = %j', { foo: { bar: 'baz' } });

      console.error('log.level=info');
      log.level = 'info';
      log.silly('silly prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.verbose('verbose prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.info('info prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.timing('timing prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.http('http prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.notice('notice prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.warn('warn prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.error('error prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.silent('silent prefix', 'x = %j', { foo: { bar: 'baz' } });
      log.error('404', 'This is a longer\n' +
        'message, with some details\n' +
        'and maybe a stack.\n');
      log.addLevel('noise', 10000, { bell: true });
      log.noise(false, 'LOUD NOISES');
      log.noise('error', 'erroring');

      result.join('').trim().should.equal(resultExpect.join('').trim());
      const withoutTimestamps = (x) => x.map((m) => {
        Boolean(m.timestamp).should.be.true;
        const copy = JSON.parse(JSON.stringify(m));
        delete copy.timestamp;
        return copy;
      });
      withoutTimestamps(log.record).should.eql(logEventsExpect);
      withoutTimestamps(logEvents).should.eql(logEventsExpect);
      withoutTimestamps(logInfoEvents).should.eql(logInfoEventsExpect);
      withoutTimestamps(logPrefixEvents).should.eql(logPrefixEventsExpect);
    });
  });

  describe('utils', function () {
    it('enableColor', function () {
      log.enableColor();
      log.useColor().should.be.true;
    });

    it('disableColor', function () {
      log.disableColor();
      log.useColor().should.be.false;
    });

    it('_buffer while paused', function () {
      log.pause();
      log.log('verbose', 'test', 'test log');
      log._buffer.length.should.equal(1);
      log.resume();
      log._buffer.length.should.equal(0);
    });
  });

  describe('log.log', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('emits error on bad loglevel', async function() {
      await new Promise((resolve, reject) => {
        log.once('error', (err) => {
          /Undefined log level: "asdf"/.test(err).should.be.true;
          resolve();
        });
        log.log('asdf', 'bad loglevel');
        setTimeout(reject, 1000);
      });
    });

    it('resolves stack traces to a plain string', async function() {
      await new Promise((resolve, reject) => {
        log.once('log', (m) => {
          /Error: with a stack trace/.test(m.message).should.be.true;
          /at Test/.test(m.message).should.be.true;
          resolve();
        });
        const err = new Error('with a stack trace');
        log.log('verbose', 'oops', err);
        setTimeout(reject, 1000);
      });
    });

    it('max record size', function() {
      log.maxRecordSize = 3;
      log.log('verbose', 'test', 'log 1');
      log.log('verbose', 'test', 'log 2');
      log.log('verbose', 'test', 'log 3');
      log.log('verbose', 'test', 'log 4');
      log.record.map(({message}) => message).should.eql([
        'log 2',
        'log 3',
        'log 4',
      ]);
      log.maxRecordSize = 2;
      log.log('verbose', 'test', 'log 5');
      log.record.map(({message}) => message).should.eql([
        'log 4',
        'log 5',
      ]);
      log.maxRecordSize = 3;
      log.log('verbose', 'test', 'log 6');
      log.record.map(({message}) => message).should.eql([
        'log 4',
        'log 5',
        'log 6',
      ]);
    });
  });

  describe('stream', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('write with no stream', function() {
      log.stream = null;
      log.write('message');
    });
  });

  describe('emitLog', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('to nonexistant level', function() {
      log.emitLog({ prefix: 'test', level: 'asdf' });
    });
  });

  describe('format', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('with nonexistant stream', function() {
      log.stream = null;
      (log._format('message') === undefined).should.be.true;
    });
    it('fg', function () {
      log.enableColor();
      const o = log._format('test message', { bg: 'blue' });
      o.includes('\u001b[44mtest message\u001b[0m').should.be.true;
    });
    it('bg', function () {
      log.enableColor();
      const o = log._format('test message', { bg: 'white' });
      o.includes('\u001b[47mtest message\u001b[0m').should.be.true;
    });
    it('bold', function () {
      log.enableColor();
      const o = log._format('test message', { bold: true });
      o.includes('\u001b[1mtest message\u001b[0m').should.be.true;
    });
    it('underline', function () {
      log.enableColor();
      const o = log._format('test message', { underline: true });
      o.includes('\u001b[4mtest message\u001b[0m').should.be.true;
    });
    it('inverse', function () {
      log.enableColor();
      const o = log._format('test message', { inverse: true });
      o.includes('\u001b[7mtest message\u001b[0m').should.be.true;
    });
  });

  describe('unleakString', function () {
    it('should unleak a string', function () {
      unleakString('yolo').should.eql('yolo');
    });
    it('should unleak a multiline string', function () {
      unleakString(' yolo\nbolo ').should.eql(' yolo\nbolo ');
    });
    it('should convert an object to a string', function () {
      for (const obj of [{}, null, undefined, [], 0]) {
        unleakString(obj).should.eql(`${obj}`);
      }
    });
  });
});
