package io.appium.android.bootstrap.utils;

import java.nio.charset.Charset;


public class UnicodeEncoder {
  private static final Charset M_UTF7 = Charset.forName("x-IMAP-mailbox-name");
  private static final Charset ASCII  = Charset.forName("US-ASCII");


  public static String encode(final String text) {
    byte[] encoded = text.getBytes(M_UTF7);
    return new String(encoded, ASCII);
  }

  public static boolean needsEncoding(final String text) {
    char[] chars = text.toCharArray();
    for (int i = 0; i < chars.length; i++) {
      int cp = Character.codePointAt(chars, i);
      if (cp > 0x7F) {
        // Selenium uses a Unicode PUA to cover certain special characters
        // see https://code.google.com/p/selenium/source/browse/java/client/src/org/openqa/selenium/Keys.java
        // these should juse be passed through as is.
        return !(cp >= 0xE000 && cp <= 0xE040);
      }
    }
    return false;
  }
}
