import {DeclarationReflection, Reflection} from 'typedoc';
import {ParentReflection} from '../types';

/**
 * Abstract base class for all reflections defined by this plugin
 */
export abstract class AppiumPluginReflection extends DeclarationReflection {
  constructor(
    name: string,
    kind: number,
    public readonly module: ParentReflection,
    parent: Reflection = module
  ) {
    super(name, kind, parent);
  }
}
