package io.appium.android.bootstrap;

/**
 * Log to standard out so that the Appium framework can pick it up.
 * 
 */
public class Logger {

  private static String prefix = "[APPIUM-UIAUTO]";
  private static String suffix = "[/APPIUM-UIAUTO]";

  public static void debug(final String msg) {
    System.out.println(Logger.prefix + " [debug] " + msg + Logger.suffix);
  }

  public static void error(final String msg) {
    System.out.println(Logger.prefix + " [debug] " + msg + Logger.suffix);
  }

  public static void info(final String msg) {
    System.out.println(Logger.prefix + " [info] " + msg + Logger.suffix);
  }
}