import {Mike} from '../../lib/mike';
import {expect} from 'chai';

describe('Mike', function () {
  it('should create args from params', function () {
    const m = new Mike({
      configFile: '1',
      remote: '2',
      branch: '3',
      prefix: '4',
    });
    expect(m.getMikeArgs('cmd', ['arg1', 'arg2'])).eql([
      'cmd',
      'arg1',
      'arg2',
      '--config-file',
      '1',
      '--remote',
      '2',
      '--branch',
      '3',
      '--prefix',
      '4',
    ]);
  });
});
