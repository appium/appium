import {Context} from 'typedoc';
import {AppiumPluginLogger} from '../logger';

export abstract class BaseConverter<Result> {
  constructor(protected ctx: Context, protected log: AppiumPluginLogger, ...args: any[]) {}

  abstract convert(): Result;
}
