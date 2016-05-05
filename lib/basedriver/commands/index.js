import sessionCmds from './session';
import settingsCmds from './settings';
import timeoutCmds from './timeout';
import findCmds from './find';

let commands = {};
Object.assign(
  commands,
  sessionCmds,
  settingsCmds,
  timeoutCmds,
  findCmds
  // add other command types here
);

export default commands;
