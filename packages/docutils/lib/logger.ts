import consola, {Consola, ConsolaOptions} from 'consola';

const rootLogger = consola.withTag('appium:docutils');

const loggers = new Map<string | undefined, Consola>([[undefined, rootLogger]]);

export default new Proxy(rootLogger, {
  get(target, prop, receiver) {
    if (prop === 'create') {
      const create = Reflect.get(target, prop, receiver) as Consola['create'];
      return (opts: ConsolaOptions) => {
        const tag = opts?.defaults?.tag;
        if (tag) {
          if (loggers.has(tag)) {
            return loggers.get(tag)!;
          }
          const child = create.call(receiver, opts);
          loggers.set(tag, child);
          return child;
        }
        return create.call(receiver, opts);
      };
    }
    return Reflect.get(target, prop);
  },
  set(target, prop, value, receiver) {
    if (prop === 'level') {
      return [...loggers.values()]
        .map((someLogger) => Reflect.set(target, prop, value, someLogger))
        .every(Boolean);
    } else {
      return Reflect.set(target, prop, value, receiver);
    }
  },
});
