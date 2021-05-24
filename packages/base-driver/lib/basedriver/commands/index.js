import sessionCmds from './session';
import settingsCmds from './settings';
import timeoutCmds from './timeout';
import findCmds from './find';
import logCmds from './log';
import executeCmds from './execute';
import eventCmds from './event';


let commands = {};

Object.assign(
  commands,
  sessionCmds,
  settingsCmds,
  timeoutCmds,
  findCmds,
  logCmds,
  executeCmds,
  eventCmds,
  // add other command types here
);

export default commands;
