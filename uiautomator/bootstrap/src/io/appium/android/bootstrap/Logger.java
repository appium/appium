package io.appium.android.bootstrap;

class Logger {
    
    private static String prefix = "[APPIUM-UIAUTO]";
    private static String suffix = "[/APPIUM-UIAUTO]";
    
    public static void info(String msg) {
        System.out.println(Logger.prefix + " [info] " + msg + Logger.suffix);
    }
    
    public static void debug(String msg) {
        System.out.println(Logger.prefix + " [debug] " + msg + Logger.suffix);
    }
    
    public static void error(String msg) {
        System.out.println(Logger.prefix + " [debug] " + msg + Logger.suffix);
    }
}