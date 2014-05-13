package io.appium.android.bootstrap.utils;

import android.os.Build;

import com.android.uiautomator.core.UiDevice;

public abstract class NotImportantViews {
  // setCompressedLayoutHeirarchy doesn't exist on API <= 17
  // http://developer.android.com/reference/android/accessibilityservice/AccessibilityServiceInfo.html#FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
  private static boolean canDiscard = Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2;
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