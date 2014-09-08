package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.utils.NotImportantViews;
import org.json.JSONException;

import java.util.Hashtable;

/**
 * Calls the uiautomator setCompressedLayoutHierarchy() function. If set to true, ignores some views during all Accessibility operations.
 */
public class CompressedLayoutHierarchy extends CommandHandler {
  @Override
  public AndroidCommandResult execute(AndroidCommand command) throws JSONException {

    boolean compressLayout;

    try {
      final Hashtable<String, Object> params = command.params();
      compressLayout = (Boolean) params.get("compressLayout");
      NotImportantViews.discard(compressLayout);
    } catch (ClassCastException  e) {
      return getErrorResult("must supply a 'compressLayout' boolean parameter");
    } catch (Exception e) {
      return getErrorResult("error setting compressLayoutHierarchy " + e.getMessage());
    }

    return getSuccessResult(compressLayout);
  }
}
