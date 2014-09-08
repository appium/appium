package io.appium.android.bootstrap.utils;

import com.android.uiautomator.core.UiDevice;

import static io.appium.android.bootstrap.utils.API.API_18;

public abstract class NotImportantViews {
  // setCompressedLayoutHeirarchy doesn't exist on API <= 17
  // http://developer.android.com/reference/android/accessibilityservice/AccessibilityServiceInfo.html#FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
  private static boolean canDiscard = API_18;
  private static boolean lastDiscard = false;

  public static void discard(boolean discard) {
    if (canDiscard) {
      if (discard != lastDiscard) {
        UiDevice.getInstance().setCompressedLayoutHeirarchy(discard);
        lastDiscard = discard;
      }
    }
  }
}