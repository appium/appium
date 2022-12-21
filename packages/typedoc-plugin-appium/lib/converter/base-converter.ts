import {Context} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {ModuleCommands} from '../model';

export abstract class BaseConverter<T> {
  constructor(
    protected ctx: Context,
    protected log: AppiumPluginLogger,
    protected readonly builtinCommands?: ModuleCommands
  ) {}

  abstract convert(): T;
}
