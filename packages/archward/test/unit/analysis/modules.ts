import type {IModule} from 'dependency-cruiser';

type DepSpec = string | {module: string; resolved?: string; couldNotResolve?: boolean};

/** Builds the part of a dependency-cruiser module that the analysis reads. */
export function mod(source: string, deps: DepSpec[] = []): IModule {
  return {
    source,
    dependencies: deps.map((d) => {
      const dep = typeof d === 'string' ? {module: d} : d;
      // like dependency-cruiser, treat a bare specifier without a resolved path as not installed
      return {couldNotResolve: !dep.resolved && !dep.module.startsWith('.'), resolved: dep.module, ...dep};
    }),
  } as unknown as IModule;
}
