package io.appium.android.bootstrap;

import java.util.HashMap;
import java.util.ArrayList;

class UnallowedTagNameException extends Exception {
    public UnallowedTagNameException(String tag) {
        super("Tag name '" + tag + "' is not supported in Android");
    }
}

class AndroidElementClassMap {
    
    private HashMap<String, String> map;
    private ArrayList<String> unallowed;
    private static AndroidElementClassMap instance;
    
    public AndroidElementClassMap() {
        map = new HashMap<String, String>();
        unallowed = new ArrayList<String>();
        map.put("text",  "TextView");
        map.put("list", "ListView");
        map.put("textfield", "EditText");        
        
        unallowed.add("secure");
    }
    
    public static String match(String selector) throws UnallowedTagNameException {
        AndroidElementClassMap inst = AndroidElementClassMap.getInstance();
        if (inst.unallowed.contains(selector)) {
            throw new UnallowedTagNameException(selector);
        } else {
            String mappedSel = inst.map.get(selector);
            if (mappedSel != null) {
                return "android.widget." + mappedSel;
            } else if (selector.contains(".")) {
                return selector;
            } else {
                selector = selector.substring(0, 1).toUpperCase() + selector.substring(1);
                return "android.widget." + selector;
            }
        }
    }
    
    private static AndroidElementClassMap getInstance() {
        if (AndroidElementClassMap.instance == null) {
            AndroidElementClassMap.instance = new AndroidElementClassMap();
        }
        return AndroidElementClassMap.instance;
    }
}
