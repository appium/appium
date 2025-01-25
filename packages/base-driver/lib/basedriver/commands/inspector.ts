import type {
  Constraints,
  IInspectorCommands,
  ListCommandsResponse,
  ListExtensionsResponse,
} from '@appium/types';
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
  async listCommands(sessionId?: string | null): Promise<ListCommandsResponse> {
    return {};
  },

  /**
   * This command is supposed to be handled by the umbrella driver.
   *
   * @param sessionId
   * @returns
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listExtensions(sessionId?: string | null): Promise<ListExtensionsResponse> {
    return {};
  },
};

mixin(InspectorCommands);
