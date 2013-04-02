package io.appium.android.bootstrap;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;

class ElementNotFoundException extends Exception {
    public ElementNotFoundException() {
        super("Could not find an element using supplied strategy");
    }
}

class NoAttributeFoundException extends Exception {
    public NoAttributeFoundException(String attr) {
        super("This element does not have the '" + attr + "' attribute");
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
    
    public String getStringAttribute(String attr) throws UiObjectNotFoundException, NoAttributeFoundException {
        String res = "";
        if (attr.equals("name")) {
            res = el.getContentDescription();
            if (res.equals("")) {
                res = el.getText();
            }
        } else if (attr.equals("text")) {
            res = el.getText();
        } else {
           throw new NoAttributeFoundException(attr); 
        }
        return res;
    }
    
    public boolean getBoolAttribute(String attr) throws UiObjectNotFoundException, NoAttributeFoundException {
        boolean res = false;
        if (attr.equals("enabled")) {
            res = el.isEnabled();
        } else if (attr.equals("checkable")) {
            res = el.isCheckable();
        } else if (attr.equals("checked")) {
            res = el.isChecked();
        } else if (attr.equals("clickable")) {
            res = el.isClickable();
        } else if (attr.equals("focusable")) {
            res = el.isFocusable();
        } else if (attr.equals("focused")) {
            res = el.isFocused();
        } else if (attr.equals("longClickable")) {
            res = el.isLongClickable();
        } else if (attr.equals("scrollable")) {
            res = el.isScrollable();
        } else if (attr.equals("selected")) {
            res = el.isSelected();
        } else if (attr.equals("displayed")) {
            res = el.exists();
        } else {
           throw new NoAttributeFoundException(attr); 
        }
        return res;
    }
}