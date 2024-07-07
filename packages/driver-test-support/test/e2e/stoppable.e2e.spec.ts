import axios from 'axios';
import B from 'bluebird';
import {Agent} from 'node:http';
import {startStoppableAppium, TestAppiumServer} from '../../lib';
import getPort from 'get-port';

describe('startStoppableAppium()', function () {
  let expect: any;

  before(async function () {
    const chai = await import('chai');
    const chaiAsPromised = await import('chai-as-promised');
    chai.use(chaiAsPromised.default);
    chai.should();
    expect = chai.expect;
  });

  it('should start an Appium server', async function () {
    let server: TestAppiumServer | undefined;
    try {
      server = await startStoppableAppium({port: await getPort()});
      expect(server, 'to be an object');
    } finally {
      if (server) {
        await expect(server.stop()).to.be.fulfilled;
      }
    }
  });

  describe('when the server has connections', function () {
    it('should stop the server and resolve with a boolean', async function () {
      const port = await getPort();
      const server = await startStoppableAppium({port});
      const getConnections = B.promisify(server.getConnections, {context: server});
      await axios.get(`http://127.0.0.1:${port}/status`, {
        httpAgent: new Agent({keepAlive: true}),
      });
      try {
        await expect(getConnections()).to.eventually.be.greaterThan(0);
      } finally {
        await expect(server.stop()).to.eventually.be.a('boolean');
      }
    });
  });
});
