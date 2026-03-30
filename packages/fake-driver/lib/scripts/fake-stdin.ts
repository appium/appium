import readline from 'node:readline';

const rl = readline.createInterface({input: process.stdin, output: process.stderr});

rl.question('Press ENTER to continue: ', () => {
  rl.close();
  // eslint-disable-next-line no-console
  console.error('You did it!');
});
