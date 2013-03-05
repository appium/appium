package io.appium.android.bootstrap;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;

class ElementNotFoundException extends Exception {
    public ElementNotFoundException() {
        super("Could not find an element using supplied strategy");
    }
}
class AndroidElement {
    
    private UiObject el;
    
    public AndroidElement(UiObject uiObj) {
        el = uiObj;
    }
    
    public UiObject getChild(UiSelector sel) throws UiObjectNotFoundException {
        return el.getChild(sel);
    }
    
    public boolean click() throws UiObjectNotFoundException {
        return el.click();
    }
    
    public String getText() throws UiObjectNotFoundException {
        return el.getText();
    }
    
    public boolean setText(String text) throws UiObjectNotFoundException {
        return el.setText(text);
    }
}