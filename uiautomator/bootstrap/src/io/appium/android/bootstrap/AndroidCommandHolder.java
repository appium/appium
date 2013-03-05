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
    
    public static boolean click(Double x, Double y) {
        Double[] coords = {x, y};
        ArrayList<Integer> posVals = absPosFromCoords(coords);
        return UiDevice.getInstance().click(posVals.get(0), posVals.get(1));
    }
    
    private static ArrayList<Integer> absPosFromCoords(Double[] coordVals) {
        UiDevice d = UiDevice.getInstance();
        Double screenX = new Double(d.getDisplayWidth());
        Double screenY = new Double(d.getDisplayHeight());
        ArrayList<Integer> retPos = new ArrayList<Integer>();
        Integer curVal;
        for (Double coord : coordVals) {
            if (coord < 1) {
                curVal = (int)(screenX * coord);
            } else {
                curVal = coord.intValue();
            }
            retPos.add(curVal);
        }
        return retPos;
    }
    
    public static boolean swipe(Double startX, Double startY, Double endX, Double endY, Integer steps) {
        UiDevice d = UiDevice.getInstance();
        Double[] coords = {startX, startY, endX, endY};
        ArrayList<Integer> posVals = absPosFromCoords(coords);
        return d.swipe(posVals.get(0), posVals.get(1), posVals.get(2), posVals.get(3), steps);        
    }
    
    public static JSONObject getDeviceSize() throws AndroidCommandException {
        UiDevice d = UiDevice.getInstance();
        JSONObject res = new JSONObject();
        try {
            res.put("width", d.getDisplayHeight());
            res.put("height", d.getDisplayWidth());
        } catch (JSONException e) {
            throw new AndroidCommandException("Error serializing height/width data into JSON");
        }
        return res;
    }
    
    public static JSONObject findElement(String strategy, String selector, String contextId) throws UiObjectNotFoundException, AndroidCommandException, ElementNotFoundException {
        UiSelector sel = selectorForFind(strategy, selector, false);
        return findElementWithSelector(sel, contextId);
    }
    
    public static JSONObject findElementByXpath(JSONArray path, String attr, String constraint, boolean substr, String contextId) throws UiObjectNotFoundException, AndroidCommandException, ElementNotFoundException {
        UiSelector sel = selectorForXpath(path, attr, constraint, substr);
        return findElementWithSelector(sel, contextId);
    }
    
    private static JSONObject findElementWithSelector(UiSelector sel, String contextId) throws UiObjectNotFoundException, AndroidCommandException, ElementNotFoundException {
        JSONObject res = new JSONObject();
        String elId;
        UiObject el;
        AndroidElementsHash elHash = AndroidElementsHash.getInstance();
        AndroidElement baseEl = contextElement(contextId);
        
        if (baseEl == null) {
            el = new UiObject(sel);
        } else {
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
            throw new ElementNotFoundException();
        }
    }
    
    public static JSONArray findElements(String strategy, String selector, String contextId) throws AndroidCommandException, UiObjectNotFoundException {
        UiSelector sel = selectorForFind(strategy, selector, true);
        return findElementsWithSelector(sel, contextId);
    }
    
    public static JSONArray findElementsByXpath(JSONArray path, String attr, String constraint, boolean substr, String contextId) throws AndroidCommandException, UiObjectNotFoundException {
        UiSelector sel = selectorForXpath(path, attr, constraint, substr);
        return findElementsWithSelector(sel, contextId);
    }
    
    private static JSONArray findElementsWithSelector(UiSelector sel, String contextId) throws AndroidCommandException, UiObjectNotFoundException {
        ArrayList<String> elIds = new ArrayList<String>();
        JSONArray res = new JSONArray();
        UiObject lastFoundObj;
        boolean keepSearching = true;
        AndroidElementsHash elHash = AndroidElementsHash.getInstance();
        AndroidElement baseEl = contextElement(contextId);
        
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
    
    private static AndroidElement contextElement(String contextId) throws AndroidCommandException {
        AndroidElement baseEl = null;
        AndroidElementsHash elHash = AndroidElementsHash.getInstance();
        
        if (!contextId.isEmpty()) {
            try {
                baseEl = elHash.getElement(contextId);
            } catch (ElementNotInHashException e) {
                throw new AndroidCommandException(e.getMessage());
            }
        }
        return baseEl;
    }
    
    private static UiSelector selectorForXpath(JSONArray path, String attr, String constraint, boolean substr) throws AndroidCommandException {
        UiSelector s = new UiSelector();
        JSONObject pathObj;
        String nodeType;
        String searchType;
        String substrStr = substr ? "true" : "false";
        Logger.info("Building xpath selector from attr " + attr + " and constraint " + constraint + " and substr " + substrStr);
        String selOut = "s";
        for (int i = 0; i < path.length(); i++) {
            try {
                pathObj = path.getJSONObject(i);
                nodeType = pathObj.getString("node");
                searchType = pathObj.getString("search");
            } catch (JSONException e) {
                throw new AndroidCommandException("Error parsing xpath path obj from JSON");
            }
            nodeType = AndroidElementClassMap.match(nodeType);
            if (searchType.equals("child")) {
                s = s.childSelector(s);
                selOut += ".childSelector(s)";
            } else {
                s = s.className(nodeType);
                selOut += ".className('" + nodeType + "')";
            }
        }
        if (attr.equals("desc") || attr.equals("name")) {
            selOut += ".description";
            if (substr) {
                selOut += "Contains";
                s = s.descriptionContains(constraint);
            } else {
                s = s.description(constraint);
            }
            selOut += "('" + constraint + "')";
        } else if (attr.equals("text") || attr.equals("value")) {
            selOut += ".text";
            if (substr) {
                selOut += "Contains";
                s = s.textContains(constraint);
            } else {
                s = s.text(constraint);
            }
            selOut += "('" + constraint + "')";
        }
        Logger.info(selOut);
        return s;
    }
    
    private static UiSelector selectorForFind(String strategy, String selector, Boolean many) throws InvalidStrategyException {
        UiSelector s = new UiSelector();
        if (strategy.equals("tag name")) {
            String androidClass = AndroidElementClassMap.match(selector);
            Logger.info("Using class selector " + androidClass + " for find");
            s = s.className(androidClass);
        } else if (strategy.equals("name")) {
            s = s.description(selector);
        } else {
            throw new InvalidStrategyException(strategy + " is not a supported selector strategy");
        }
        
        if (!many) {
            s = s.instance(0);
        }
        
        return s;
    }

}