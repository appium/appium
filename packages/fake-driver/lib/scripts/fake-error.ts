import yoctoSpinner from 'yocto-spinner';

const spinner = yoctoSpinner({text: 'Running fake-error...'}).start();

setTimeout(() => {
  spinner.error('Oh nooooooo!');
  throw Error('Unsuccessfully ran the script');
}, 1000);
