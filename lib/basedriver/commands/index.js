import sessionCmds from './session';
import settingsCmds from './settings';
import timeoutCmds from './timeout';
import findCmds from './find';
import logCmds from './log';


let commands = {};
Object.assign(
  commands,
  sessionCmds,
  settingsCmds,
  timeoutCmds,
  findCmds,
  logCmds,
  // add other command types here
);

export default commands;
