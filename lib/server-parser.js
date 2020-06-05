import serverArgs from './server-args';

function addServerToParser (sharedArgs, subParsers, debug) {
  const serverParser = subParsers.addParser('server', {
    addHelp: true,
    help: 'Run an Appium server',
    debug
  });

  for (const [flags, opts] of [...sharedArgs, ...serverArgs]) {
    // addArgument mutates arguments so make copies
    serverParser.addArgument([...flags], {...opts});
  }

  return serverArgs;
}

function getDefaultServerArgs () {
  let defaults = {};
  for (let [, arg] of serverArgs) {
    defaults[arg.dest] = arg.defaultValue;
  }
  return defaults;
}


export {
  serverArgs,
  addServerToParser,
  getDefaultServerArgs,
};
