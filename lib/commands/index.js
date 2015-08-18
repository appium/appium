import sessionCmds from './session';
import settingsCmds from './settings';

let commands = {};
Object.assign(
  commands,
  sessionCmds,
  settingsCmds
  // add other command types here
);

export default commands;
