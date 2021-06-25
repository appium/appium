import sessionCmds from './session.js';
import settingsCmds from './settings.js';
import timeoutCmds from './timeout.js';
import findCmds from './find.js';
import logCmds from './log.js';
import executeCmds from './execute.js';
import eventCmds from './event.js';


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
