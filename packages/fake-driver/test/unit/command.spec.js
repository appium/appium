import _ from 'lodash';

import * as commands from '../../lib/commands';
import {FakeDriver} from '../../lib/driver';

describe('Driver commands', function () {
  const allCommands = Object.values(commands).map(Object.keys).flat();

  it('should import all commands and not leave any out', function () {
    const driver = new FakeDriver();
    _.difference(allCommands, Object.keys(driver)).should.be.empty;
  });
});
