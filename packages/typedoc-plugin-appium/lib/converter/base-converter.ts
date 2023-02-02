import {Context} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {ModuleCommands} from '../model';

export abstract class BaseConverter<Result> {
  constructor(protected ctx: Context, protected log: AppiumPluginLogger, ...args: any[]) {}

  abstract convert(): Result;
}
