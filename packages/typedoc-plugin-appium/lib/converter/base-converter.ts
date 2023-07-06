import {ProjectReflection} from 'typedoc';
import {AppiumPluginLogger} from '../logger';

export abstract class BaseConverter<Result> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(
    protected project: ProjectReflection,
    protected log: AppiumPluginLogger,
    ...args: any[]
  ) {}

  abstract convert(): Result;
}
