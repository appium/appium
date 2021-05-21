import _ from 'lodash';

import contextCommands from '../lib/commands/contexts';
import elementCommands from '../lib/commands/element';
import findCommands from '../lib/commands/find';
import generalCommands from '../lib/commands/general';
import exportedCommands from '../lib/commands';


describe('Driver commands', function () {
  let allCommands = [
    _.keys(contextCommands),
    _.keys(elementCommands),
    _.keys(findCommands),
    _.keys(generalCommands)
  ];
  let totalCommands = _.sum(allCommands.map(c => c.length));
  it('should not overlap between files', function () {
    _.union(...allCommands).length.should.equal(totalCommands);
  });
  it('should export all commands and not leave any out', function () {
    _.difference(
      _.union(...allCommands),
      _.keys(exportedCommands)
    ).should.eql([]);
  });
});
