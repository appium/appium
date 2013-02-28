package io.appium.android.bootstrap;

class AndroidElementClassMap {
    
    public static String Match(String selector) {
        if (selector.equals("button")) {
            return "android.widget.Button";
        } else if (selector.contains("android.")) {
            return selector;
        } else {
            selector = selector.substring(0, 0).toUpperCase() + selector.substring(1);
            return "android.widget." + selector;
        }
    }
}