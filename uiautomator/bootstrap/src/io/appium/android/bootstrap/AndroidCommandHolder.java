package io.appium.android.bootstrap;

import org.json.JSONObject;
import org.json.JSONException;

import java.util.Hashtable;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiSelector;
import com.android.uiautomator.core.UiObjectNotFoundException;

import io.appium.android.bootstrap.AndroidElementClassMap;
import io.appium.android.bootstrap.AndroidElementsHash;

class AndroidCommandException extends Exception {
    public AndroidCommandException(String msg) {
        super(msg);
    }
}

class AndroidCommandHolder {
    
    public static boolean click(int x, int y) {
        return UiDevice.getInstance().click(x, y);
    }
    
    public static JSONObject getDeviceSize() throws AndroidCommandException {
        UiDevice d = UiDevice.getInstance();
        JSONObject res = new JSONObject();
        try {
            res.put("x", d.getDisplayHeight());
            res.put("y", d.getDisplayWidth());
        } catch (JSONException e) {
            throw new AndroidCommandException("Error serializing height/width data into JSON");
        }
        return res;
    }
    
    public static String findElement(String strategy, String selector, String contextId) throws UiObjectNotFoundException {
        String elId;
        return elId;
    }
    
    public static String[] findElements(String strategy, String selector, String contextId) {
        String[] elIds = {};
        return elIds;
    }
    
    public static String findElementByClass(String className) throws UiObjectNotFoundException {
        AndroidElementsHash els = AndroidElementsHash.getInstance();
        UiObject el = new UiObject((new UiSelector()).className(className).instance(0));
        return els.addElement(el);
    }

}