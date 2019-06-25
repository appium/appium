import sessionCmds from './session';
import settingsCmds from './settings';
import timeoutCmds from './timeout';
import findCmds from './find';
import logCmds from './log';
import imagesCmds from './images';
import executeCmds from './execute';


let commands = {};

Object.assign(
  commands,
  sessionCmds,
  settingsCmds,
  timeoutCmds,
  findCmds,
  logCmds,
  imagesCmds,
  executeCmds,
  // add other command types here
);

export default commands;
