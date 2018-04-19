import sessionCmds from './session';
import settingsCmds from './settings';
import timeoutCmds from './timeout';
import findCmds from './find';
import logCmds from './log';
import imagesCmds from './images';


let commands = {};
Object.assign(
  commands,
  sessionCmds,
  settingsCmds,
  timeoutCmds,
  findCmds,
  logCmds,
  imagesCmds,
  // add other command types here
);

export default commands;
