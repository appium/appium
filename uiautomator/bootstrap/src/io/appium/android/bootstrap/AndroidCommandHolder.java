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
        Double[] xCoords = {x};
        Double[] yCoords = {y};
        ArrayList<Integer> posXVals = absXPosFromCoords(xCoords);
        ArrayList<Integer> posYVals = absYPosFromCoords(yCoords);
        return UiDevice.getInstance().click(posXVals.get(0), posYVals.get(1));
    }
    
    private static ArrayList<Integer> absPosFromCoords(Double[] coordVals, Double screenDim) {
        ArrayList<Integer> retPos = new ArrayList<Integer>();
        Integer curVal;
        for (Double coord : coordVals) {
            if (coord < 1) {
                curVal = (int)(screenDim * coord);
            } else {
                curVal = coord.intValue();
            }
            retPos.add(curVal);
        }
        return retPos;
    }
    
    private static ArrayList<Integer> absXPosFromCoords(Double[] coordVals) {
        UiDevice d = UiDevice.getInstance();
        Double screenX = new Double(d.getDisplayWidth());
        return absPosFromCoords(coordVals, screenX);
    }
    
    private static ArrayList<Integer> absYPosFromCoords(Double[] coordVals) {
        UiDevice d = UiDevice.getInstance();
        Double screenY = new Double(d.getDisplayHeight());
        return absPosFromCoords(coordVals, screenY);
    }
    
    public static boolean swipe(Double startX, Double startY, Double endX, Double endY, Integer steps) {
        UiDevice d = UiDevice.getInstance();
        Double[] xCoords = {startX, endX};
        Double[] yCoords = {startY, endY};
        ArrayList<Integer> posXVals = absXPosFromCoords(xCoords);
        ArrayList<Integer> posYVals = absYPosFromCoords(yCoords);
        return d.swipe(posXVals.get(0), posYVals.get(0), posXVals.get(1), posYVals.get(1), steps);        
    }
    
    public static boolean flick(Integer xSpeed, Integer ySpeed) {
        UiDevice d = UiDevice.getInstance();
        Integer screenX = d.getDisplayWidth();
        Integer screenY = d.getDisplayHeight();
        Integer startX = screenX / 2;
        Integer startY = screenY / 2;
        Double speedRatio = (double) xSpeed / ySpeed;
        Integer xOff;
        Integer yOff;
        if (speedRatio < 1) {
            yOff = screenY / 4;
            xOff = (int)((double) screenX / 4 * speedRatio);
        } else {
            xOff = screenX / 4;
            yOff = (int)((double) screenY / 4 / speedRatio);
        }
        Integer endX = startX + (Integer.signum(xSpeed) * xOff);
        Integer endY = startY + (Integer.signum(ySpeed) * yOff);
        Double speed = Math.max(1250, Math.sqrt((xSpeed*xSpeed)+(ySpeed*ySpeed)));
        Integer steps = (1250 / speed.intValue()) + 1;
        return d.swipe(startX, startY, endX, endY, steps);
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
        
        boolean useIndex = sel.toString().contains("CLASS_REGEX=");
        UiSelector tmp = null;
        int counter = 0;
        while (keepSearching) {
            if (baseEl == null) {
                Logger.info("keep searching A " + counter + " useIndex? " + useIndex);
                if (useIndex) {
                  tmp = sel.index(counter);
                } else {
                  tmp = sel.instance(counter);
                }
                lastFoundObj = new UiObject(tmp);
            } else {
                Logger.info("keep searching B " + counter);
                lastFoundObj = baseEl.getChild(sel.instance(counter));
            }
            counter++;
            if (lastFoundObj != null && lastFoundObj.exists()) {
                Logger.info("Found obj.");
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

        // $driver.find_element :xpath, %(//*[contains(@text, 'agree')])
        // info: [ANDROID] [info] Building xpath selector from attr text and
        // constraint agree and substr true
        // info: [ANDROID] [info] s.className('*').textContains('agree')
        try {
          nodeType = path.getJSONObject(0).getString("node");
        } catch (JSONException e) {
          throw new AndroidCommandException(
              "Error parsing xpath path obj from JSON");
        }

        if (attr.toLowerCase().contentEquals("text") && !constraint.isEmpty()
            && substr == true && nodeType.contentEquals("*") == true) {
          selOut += ".textContains('" + constraint + "')";
          s = s.textContains(constraint);
          Logger.info(selOut);
          return s;
        }

        // //*[contains(@tag, "button")]
        if (attr.toLowerCase().contentEquals("tag") && !constraint.isEmpty()
            && substr == true && nodeType.contentEquals("*") == true) {
          // (?i) = case insensitive match. Esape everything that isn't an alpha num.
          // use .* to match on contains.
          constraint = "(?i)^.*" + constraint.replaceAll("([^\\p{Alnum}])", "\\\\$1") + ".*$";
          selOut += ".classNameMatches('" + constraint + "')";
          s = s.classNameMatches(constraint);
          Logger.info(selOut);
          return s;
        }

        for (int i = 0; i < path.length(); i++) {
            try {
                pathObj = path.getJSONObject(i);
                nodeType = pathObj.getString("node");
                searchType = pathObj.getString("search");
            } catch (JSONException e) {
                throw new AndroidCommandException("Error parsing xpath path obj from JSON");
            }
            try {
                nodeType = AndroidElementClassMap.match(nodeType);
            } catch (UnallowedTagNameException e) {
                throw new AndroidCommandException(e.getMessage());
            }
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
    
    private static UiSelector selectorForFind(String strategy, String selector, Boolean many) throws InvalidStrategyException, AndroidCommandException {
        UiSelector s = new UiSelector();
        if (strategy.equals("tag name")) {
            String androidClass = "";
            try {
                androidClass = AndroidElementClassMap.match(selector);
            } catch (UnallowedTagNameException e) {
                throw new AndroidCommandException(e.getMessage());
            }

            if (androidClass.contentEquals("android.widget.Button")) {
              androidClass += "|android.widget.ImageButton";
              androidClass = androidClass.replaceAll("([^\\p{Alnum}|])", "\\\\$1");
              s = s.classNameMatches("^" + androidClass + "$");
            } else {
              s = s.className(androidClass);
            }
            Logger.info("Using class selector " + androidClass + " for find");
        } else if (strategy.equals("name")) {
            s = s.descriptionMatches("(?i).*" + selector.replaceAll("([^\\p{Alnum}])", "\\\\$1") + ".*");
        } else {
            throw new InvalidStrategyException(strategy + " is not a supported selector strategy");
        }
        
        if (!many) {
            s = s.instance(0);
        }
        
        return s;
    }

}
