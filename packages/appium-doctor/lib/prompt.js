import { inquirer } from './utils';

let persistentResponse;

const fixItQuestion = {
  type: 'list',
  name: 'confirmation',
  message: 'Fix it:',
  choices: ['yes', 'no', 'always', 'never'],
  filter (val) {
    return val.toLowerCase();
  }
};

function configure (opts) {
  if (opts.yes) {
    persistentResponse = 'yes';
  }
  if (opts.no) {
    persistentResponse = 'no';
  }
}

function clear () {
  persistentResponse = undefined;
}

async function fixIt () {
  if (persistentResponse) {
    return persistentResponse;
  }
  let resp = await inquirer.prompt(fixItQuestion);
  persistentResponse = resp.confirmation === 'always' ? 'yes' : persistentResponse;
  persistentResponse = resp.confirmation === 'never' ? 'no' : persistentResponse;
  return persistentResponse || resp.confirmation;
}

export { configure, fixIt, clear };
