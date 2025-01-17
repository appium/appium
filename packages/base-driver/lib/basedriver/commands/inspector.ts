import type {Constraints, IInspectorCommands, CommandsMap} from '@appium/types';
import {mixin} from './mixin';

import _ from 'lodash';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends IInspectorCommands {}
}

const InspectorCommands: IInspectorCommands = {

  /**
   * This command is supposed to be handled by the umbrella driver.
   *
   * @param sessionId
   * @returns
   */
  listCommands(sessionId?: string | null): CommandsMap {
    return {};
  }
};

mixin(InspectorCommands);
