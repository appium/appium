import {expect, use} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {fetchInterfaces} from '../../../lib/helpers/network';

describe('helpers/network', function () {
  before(async function () {
    use(chaiAsPromised);
  });

  describe('fetchInterfaces()', function () {
    it('should fetch interfaces for ipv4 only', function () {
      expect(fetchInterfaces(4).length).to.be.greaterThan(0);
    });

    it('should fetch interfaces for ipv6 only', function () {
      expect(fetchInterfaces(6).length).to.be.greaterThan(0);
    });

    it('should fetch interfaces for ipv4 and ipv6', function () {
      expect(fetchInterfaces().length).to.be.greaterThan(0);
    });
  });
});
