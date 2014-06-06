package io.appium.android.bootstrap.utils;

import android.os.Build;

public class API {

  /** True if the device is >= API 18 **/
  public static final boolean API_18 = Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2;
}