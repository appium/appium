package io.appium.android.bootstrap;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONArray;
import org.json.JSONException;

import java.util.Arrays;
import java.util.ArrayList;
import java.util.Hashtable;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiSelector;
import com.android.uiautomator.core.UiObjectNotFoundException;

class AndroidCommandException extends Exception {
    public AndroidCommandException(String msg) {
        super(msg);
    }
}

class InvalidStrategyException extends AndroidCommandException {
    public InvalidStrategyException(String msg) {
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
    
    public static JSONObject findElement(String strategy, String selector, String contextId) throws UiObjectNotFoundException, AndroidCommandException, ElementNotFoundException {
        JSONObject res = new JSONObject();
        String elId;
        UiSelector sel = AndroidCommandHolder.selectorForFind(strategy, selector, false);
        UiObject el;
        AndroidElement baseEl;
        AndroidElementsHash elHash = AndroidElementsHash.getInstance();
        if (contextId.isEmpty()) {
            el = new UiObject(sel);
        } else {
            try {
                baseEl = elHash.getElement(contextId);
            } catch (ElementNotInHashException e) {
                throw new AndroidCommandException(e.getMessage());
            }
            el = baseEl.getChild(sel);
        }
        
        if (el.exists()) {
            elId = elHash.addElement(el);
            try {
                res.put("ELEMENT", elId);
            } catch (JSONException e) {
                throw new AndroidCommandException("Error serializing element ID into JSON");
            }
            return res;
        } else {
            throw new ElementNotFoundException(strategy, selector);
        }
    }
    
    public static JSONArray findElements(String strategy, String selector, String contextId) throws AndroidCommandException, UiObjectNotFoundException {
        ArrayList<String> elIds = new ArrayList<String>();
        JSONArray res = new JSONArray();
        UiSelector sel = AndroidCommandHolder.selectorForFind(strategy, selector, true);
        UiObject lastFoundObj;
        boolean keepSearching = true;
        AndroidElement baseEl = null;
        AndroidElementsHash elHash = AndroidElementsHash.getInstance();
        
        if (!contextId.isEmpty()) {
            try {
                baseEl = elHash.getElement(contextId);
            } catch (ElementNotInHashException e) {
                throw new AndroidCommandException(e.getMessage());
            }
        }
        
        int counter = 0;
        while (keepSearching) {
            if (baseEl == null) {
                lastFoundObj = new UiObject(sel.instance(counter));
            } else {
                lastFoundObj = baseEl.getChild(sel.instance(counter));
            }
            counter++;
            if (lastFoundObj != null && lastFoundObj.exists()) {
                elIds.add(elHash.addElement(lastFoundObj));
            } else {
                keepSearching = false;
            }
        }
        
        for (String elId : elIds) {
            JSONObject idObj = new JSONObject();
            try {
                idObj.put("ELEMENT", elId);
            } catch (JSONException e) {
                throw new AndroidCommandException("Error serializing element ID into JSON");
            }
            res.put(idObj);
        }
        return res;
    }
    
    private static UiSelector selectorForFind(String strategy, String selector, Boolean many) throws InvalidStrategyException {
        UiSelector s = new UiSelector();
        if (strategy.equals("tag name")) {
            String androidClass = AndroidElementClassMap.match(selector);
            Logger.info("Using class selector " + androidClass + " for find");
            s = s.className(androidClass);
        } else {
            throw new InvalidStrategyException(strategy + " is not a supported selector strategy");
        }
        
        if (!many) {
            s = s.instance(0);
        }
        
        return s;
    }

}