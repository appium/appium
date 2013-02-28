package io.appium.android.bootstrap;

import java.util.Hashtable;
import com.android.uiautomator.core.UiObject;

class ElementNotInHashException extends Exception {
    public ElementNotInHashException(String message) {
        super(message);
    }
}

class AndroidElementsHash {
    
    private Hashtable<String, UiObject> elements;
    private Integer counter;
    private static AndroidElementsHash instance;
    
    public AndroidElementsHash() {
        counter = 0;
        elements = new Hashtable<String, UiObject>();
    }
    
    public String addElement(UiObject element) {
        String key = (counter++).toString();
        elements.put(key, element);
        return key;
    }
    
    public UiObject getElement(String key) throws ElementNotInHashException {
        UiObject el = elements.get(key);
        if (el == null) {
            throw new ElementNotInHashException("Could not find element with key " + key);
        } else {
            return el;
        }
    }
    
    public static AndroidElementsHash getInstance() {
        if (AndroidElementsHash.instance == null) {
            AndroidElementsHash.instance = new AndroidElementsHash();
        }
        return AndroidElementsHash.instance;
    }
}