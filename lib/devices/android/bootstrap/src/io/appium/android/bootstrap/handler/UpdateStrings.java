package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.handler.Find;

/**
 * This handler is used to update the apk strings.
 *
 */
public class UpdateStrings extends CommandHandler {

  /*
   * @param command The {@link AndroidCommand} used for this handler.
   *
   * @return {@link AndroidCommandResult}
   *
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.
   * bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(final AndroidCommand command) {
    Find.loadStringsJson();
    return getSuccessResult(true);
  }
}