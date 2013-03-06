package io.appium.android.bootstrap;

import java.util.HashMap;

class AndroidElementClassMap {
    
    private HashMap<String, String> map;
    private static AndroidElementClassMap instance;
    
    public AndroidElementClassMap() {
        map = new HashMap<String, String>();
        map.put("text",  "TextView");
        map.put("list", "ListView");
        map.put("textfield", "EditText");
    }
    
    public static String match(String selector) {
        AndroidElementClassMap inst = AndroidElementClassMap.getInstance();
        String mappedSel = inst.map.get(selector);
        if (mappedSel != null) {
            return "android.widget." + mappedSel;
        } else if (selector.contains("android.")) {
            return selector;
        } else {
            selector = selector.substring(0, 1).toUpperCase() + selector.substring(1);
            return "android.widget." + selector;
        }
    }
    
    private static AndroidElementClassMap getInstance() {
        if (AndroidElementClassMap.instance == null) {
            AndroidElementClassMap.instance = new AndroidElementClassMap();
        }
        return AndroidElementClassMap.instance;
    }
}
