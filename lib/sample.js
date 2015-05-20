import Q from 'q';

let p = new Q('123');

async function func() {
  return await p;
}

export default {func: func};
