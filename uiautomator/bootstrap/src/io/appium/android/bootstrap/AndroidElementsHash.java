package io.appium.android.bootstrap;

import java.util.Hashtable;
import com.android.uiautomator.core.UiObject;

class ElementNotInHashException extends Exception {
    public ElementNotInHashException(String message) {
        super(message);
    }
}

class AndroidElementsHash {
    
    private Hashtable<String, AndroidElement> elements;
    private Integer counter;
    private static AndroidElementsHash instance;
    
    public AndroidElementsHash() {
        counter = 0;
        elements = new Hashtable<String, AndroidElement>();
    }
    
    public String addElement(UiObject element) {
        String key = (counter++).toString();
        AndroidElement el = new AndroidElement(element);
        elements.put(key, el);
        return key;
    }
    
    public AndroidElement getElement(String key) throws ElementNotInHashException {
        AndroidElement el = elements.get(key);
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