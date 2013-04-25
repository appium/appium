package io.appium.android.screenshooter;

/**
 * Log to standard out so that the Appium framework can pick it up.
 * 
 */
public class Logger {
  public static final String ANSI_RESET = "\u001B[0m";
  public static final String ANSI_GREEN = "\u001B[32m";
  public static final String ANSI_RED   = "\u001B[31m";
  public static final String ANSI_WHITE = "\u001B[37m";

  public static void debug(final String msg) {
    System.out.println(white(" [debug] " + msg));
  }

  public static void error(final String msg) {
    System.out.println(red(" [error] " + msg));
  }

  public static String green(final String msg) {
    if (System.getProperty("os.name").startsWith("Windows") == false) {
      return ANSI_GREEN + msg + ANSI_RESET;
    }
    return msg;
  }

  public static void info(final String msg) {
    System.out.println(green(msg));
  }

  public static String red(final String msg) {
    if (System.getProperty("os.name").startsWith("Windows") == false) {
      return ANSI_RED + msg + ANSI_RESET;
    }
    return msg;
  }

  public static String white(final String msg) {
    if (System.getProperty("os.name").startsWith("Windows") == false) {
      return ANSI_WHITE + msg + ANSI_RESET;
    }
    return msg;
  }
}