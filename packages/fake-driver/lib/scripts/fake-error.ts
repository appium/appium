import ora from 'ora';

const spinner = ora('Running fake-error...').start();

setTimeout(() => {
  spinner.fail('Oh nooooooo!');
  throw Error('Unsuccessfully ran the script');
}, 1000);
