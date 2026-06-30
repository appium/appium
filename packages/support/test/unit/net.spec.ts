import {expect} from 'chai';
import {describe, it} from 'node:test';
import {uploadFile} from '../../lib/net';

describe('net', function () {
  describe('uploadFile()', function () {
    it('should accept remote URLs typed as strings', function () {
      const upload = (remoteUri: string) =>
        uploadFile('/path/to/local/file', remoteUri, {
          method: 'PUT',
          headers: {'content-type': 'video/mp4'},
        });

      expect(upload).to.be.a('function');
    });
  });
});
