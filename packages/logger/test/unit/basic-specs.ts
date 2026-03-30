/* eslint-disable no-console */
import {expect} from 'chai';
import {Log, markSensitive} from '../../lib/log';
import {unleakString} from '../../lib/utils';
import {Stream} from 'node:stream';
import _ from 'lodash';
import type {Log as LogType} from '../../lib/log';

describe('basic', function () {
  let log: LogType;

  describe('logging', function () {
    let s: InstanceType<typeof Stream> & {write: (m: string) => void; writable: boolean; isTTY: boolean; end: () => void};
    let result: string[] = [];
    let logEvents: Array<{id: number; level: string; prefix: string; message: string; timestamp?: unknown}> = [];
    let logInfoEvents: typeof logEvents = [];
    let logPrefixEvents: typeof logEvents = [];
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
      {id: 2, level: 'info', prefix: 'info prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 11, level: 'info', prefix: 'info prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 20, level: 'info', prefix: 'info prefix', message: 'x = {"foo":{"bar":"baz"}}'},
    ];
    const logInfoEventsExpect = logPrefixEventsExpect;
    const logEventsExpect = [
      {id: 0, level: 'silly', prefix: 'silly prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 1, level: 'verbose', prefix: 'verbose prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 2, level: 'info', prefix: 'info prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 3, level: 'timing', prefix: 'timing prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 4, level: 'http', prefix: 'http prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 5, level: 'notice', prefix: 'notice prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 6, level: 'warn', prefix: 'warn prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 7, level: 'error', prefix: 'error prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 8, level: 'silent', prefix: 'silent prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 9, level: 'silly', prefix: 'silly prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 10, level: 'verbose', prefix: 'verbose prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 11, level: 'info', prefix: 'info prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 12, level: 'timing', prefix: 'timing prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 13, level: 'http', prefix: 'http prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 14, level: 'notice', prefix: 'notice prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 15, level: 'warn', prefix: 'warn prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 16, level: 'error', prefix: 'error prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 17, level: 'silent', prefix: 'silent prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 18, level: 'silly', prefix: 'silly prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 19, level: 'verbose', prefix: 'verbose prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 20, level: 'info', prefix: 'info prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 21, level: 'timing', prefix: 'timing prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 22, level: 'http', prefix: 'http prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 23, level: 'notice', prefix: 'notice prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 24, level: 'warn', prefix: 'warn prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 25, level: 'error', prefix: 'error prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 26, level: 'silent', prefix: 'silent prefix', message: 'x = {"foo":{"bar":"baz"}}'},
      {id: 27, level: 'error', prefix: '404', message: 'This is a longer\nmessage, with some details\nand maybe a stack.\n'},
      {id: 28, level: 'noise', prefix: '', message: 'LOUD NOISES'},
      {id: 29, level: 'noise', prefix: 'error', message: 'erroring'},
    ];

    beforeEach(function () {
      result = [];
      logEvents = [];
      logInfoEvents = [];
      logPrefixEvents = [];

      log = new Log();
      s = Object.assign(new Stream(), {
        write: (m: string) => result.push(m),
        writable: true,
        isTTY: true,
        end: () => {},
      }) as typeof s;
      log.stream = s as any;
      log.heading = 'npm';
    });

    it('should work', function () {
      expect(log.stream).to.equal(s);
      log.on('log', logEvents.push.bind(logEvents) as any);
      log.on('log.info', logInfoEvents.push.bind(logInfoEvents) as any);
      log.on('info prefix', logPrefixEvents.push.bind(logPrefixEvents) as any);

      console.error('log.level=silly');
      log.level = 'silly';
      log.silly('silly prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.verbose('verbose prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.info('info prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.timing('timing prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.http('http prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.notice('notice prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.warn('warn prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.error('error prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.silent('silent prefix', 'x = %j', {foo: {bar: 'baz'}});

      console.error('log.level=silent');
      log.level = 'silent';
      log.silly('silly prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.verbose('verbose prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.info('info prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.timing('timing prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.http('http prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.notice('notice prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.warn('warn prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.error('error prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.silent('silent prefix', 'x = %j', {foo: {bar: 'baz'}});

      console.error('log.level=info');
      log.level = 'info';
      log.silly('silly prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.verbose('verbose prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.info('info prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.timing('timing prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.http('http prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.notice('notice prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.warn('warn prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.error('error prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.silent('silent prefix', 'x = %j', {foo: {bar: 'baz'}});
      log.error('404', 'This is a longer\nmessage, with some details\nand maybe a stack.\n');
      log.addLevel('noise', 10000, {bell: true});
      (log as any).noise(false, 'LOUD NOISES');
      (log as any).noise('error', 'erroring');

      expect(result.join('').trim()).to.equal(resultExpect.join('').trim());
      const withoutTimestamps = (x: typeof logEvents) =>
        x.map((m) => {
          expect(Boolean((m as any).timestamp)).to.be.true;
          const copy = JSON.parse(JSON.stringify(m));
          delete copy.timestamp;
          return copy;
        });
      expect(withoutTimestamps(log.record as any)).to.eql(logEventsExpect);
      expect(withoutTimestamps(logEvents)).to.eql(logEventsExpect);
      expect(withoutTimestamps(logInfoEvents)).to.eql(logInfoEventsExpect);
      expect(withoutTimestamps(logPrefixEvents)).to.eql(logPrefixEventsExpect);
    });
  });

  describe('utils', function () {
    it('enableColor', function () {
      log.enableColor();
      expect((log as any)._format('x', {fg: 'red'})).to.include('\u001b');
    });

    it('disableColor', function () {
      log.disableColor();
      expect((log as any)._format('x', {fg: 'red'})).to.equal('x');
    });

    it('_buffer while paused', function () {
      log.pause();
      log.log('verbose', 'test', 'test log');
      expect(log._buffer.length).to.equal(1);
      log.resume();
      expect(log._buffer.length).to.equal(0);
    });
  });

  describe('log.log', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('emits error on bad loglevel', async function () {
      await new Promise<void>((resolve, reject) => {
        log.once('error', (err: Error) => {
          expect(/Undefined log level: "asdf"/.test(String(err))).to.be.true;
          resolve();
        });
        log.log('asdf', '', 'bad loglevel');
        setTimeout(() => reject(new Error('timeout')), 1000);
      });
    });

    it('resolves stack traces to a plain string', async function () {
      await new Promise<void>((resolve, reject) => {
        log.once('log', (m: {message: string}) => {
          expect(/Error: with a stack trace/.test(m.message)).to.be.true;
          expect(/at Test/.test(m.message)).to.be.true;
          resolve();
        });
        const err = new Error('with a stack trace');
        log.log('verbose', 'oops', err);
        setTimeout(() => reject(new Error('timeout')), 1000);
      });
    });

    it('replaces sensitive messages', async function () {
      log.updateAsyncStorage({isSensitive: true}, true);
      log.log('verbose', 'test', markSensitive('log 1'));
      expect(_.last(log.record)!.message).to.eql('**SECURE**');
      log.updateAsyncStorage({isSensitive: false}, true);
      log.log('verbose', 'test', markSensitive('log 1'));
      expect(_.last(log.record)!.message).to.eql('log 1');
    });

    it('max record size', function () {
      log.maxRecordSize = 3;
      log.log('verbose', 'test', 'log 1');
      log.log('verbose', 'test', 'log 2');
      log.log('verbose', 'test', 'log 3');
      log.log('verbose', 'test', 'log 4');
      expect(log.record.map(({message}) => message)).to.eql(['log 2', 'log 3', 'log 4']);
      log.maxRecordSize = 2;
      log.log('verbose', 'test', 'log 5');
      expect(log.record.map(({message}) => message)).to.eql(['log 4', 'log 5']);
      log.maxRecordSize = 3;
      log.log('verbose', 'test', 'log 6');
      expect(log.record.map(({message}) => message)).to.eql(['log 4', 'log 5', 'log 6']);
    });
  });

  describe('stream', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('write with no stream', function () {
      log.stream = null as any;
      (log as any).write('message');
    });
  });

  describe('emitLog', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('to nonexistent level', function () {
      (log as any).emitLog({prefix: 'test', level: 'asdf'});
    });
  });

  describe('format', function () {
    beforeEach(function () {
      log = new Log();
    });

    it('with nonexistent stream', function () {
      log.stream = null as any;
      expect((log as any)._format('message')).to.equal(undefined);
    });
    it('fg', function () {
      log.enableColor();
      const o = (log as any)._format('test message', {bg: 'blue'});
      expect(o).to.include('\u001b[44mtest message\u001b[0m');
    });
    it('bg', function () {
      log.enableColor();
      const o = (log as any)._format('test message', {bg: 'white'});
      expect(o).to.include('\u001b[47mtest message\u001b[0m');
    });
    it('bold', function () {
      log.enableColor();
      const o = (log as any)._format('test message', {bold: true});
      expect(o).to.include('\u001b[1mtest message\u001b[0m');
    });
    it('underline', function () {
      log.enableColor();
      const o = (log as any)._format('test message', {underline: true});
      expect(o).to.include('\u001b[4mtest message\u001b[0m');
    });
    it('inverse', function () {
      log.enableColor();
      const o = (log as any)._format('test message', {inverse: true});
      expect(o).to.include('\u001b[7mtest message\u001b[0m');
    });
  });

  describe('unleakString', function () {
    it('should unleak a string', function () {
      expect(unleakString('yolo')).to.eql('yolo');
    });
    it('should unleak a multiline string', function () {
      expect(unleakString(' yolo\nbolo ')).to.eql(' yolo\nbolo ');
    });
    it('should convert an object to a string', function () {
      for (const obj of [{}, null, undefined, [], 0]) {
        expect(unleakString(obj as any)).to.eql(`${obj}`);
      }
    });
  });
});
