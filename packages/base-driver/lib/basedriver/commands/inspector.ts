import type {Constraints, IInspectorCommands, ListCommandsResponse} from '@appium/types';
import {mixin} from './mixin';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  listCommands(sessionId?: string | null): ListCommandsResponse {
    return {};
  }
};

mixin(InspectorCommands);
