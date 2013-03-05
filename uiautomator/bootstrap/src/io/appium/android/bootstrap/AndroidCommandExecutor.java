package io.appium.android.bootstrap;

import org.json.JSONException;
import org.json.JSONObject;
import org.json.JSONArray;

import com.android.uiautomator.core.UiObjectNotFoundException;

import java.util.Hashtable;

//import java.beans.BeanInfo;
//import java.beans.Introspector;
//import java.beans.IntrospectionException;
//import java.beans.PropertyDescriptor;

class AndroidCommandExecutor {
    
    AndroidCommand command;
    
    public AndroidCommandExecutor(AndroidCommand cmd) {
        command = cmd;
    }
    
    public AndroidCommandResult execute() {
        String action;
        Hashtable<String, Object> params;
        try {
            action = command.action();
            params = command.params();
        } catch (JSONException e) {
            Logger.error("Could not decode action/params of command");
            return getErrorResult("Could not decode action/params of command, please check format!");
        }
        
        // TODO: get all this information using introspection, rather than if-elsing everywhere?
        // Or maybe we like getting params out before passing to AndroidCommandHolder
        try {
            if (action.equals("click")) {
                Double x = Double.parseDouble(params.get("x").toString());
                Double y = Double.parseDouble(params.get("y").toString());
                boolean res = AndroidCommandHolder.click(x, y);
                return getSuccessResult(res);
            } else if (action.equals("swipe")) {
                Double startX = Double.parseDouble(params.get("startX").toString());
                Double startY = Double.parseDouble(params.get("startY").toString());
                Double endX = Double.parseDouble(params.get("endX").toString());
                Double endY = Double.parseDouble(params.get("endY").toString());
                Integer steps = (Integer) params.get("steps");
                return getSuccessResult(AndroidCommandHolder.swipe(startX, startY, endX, endY, steps));
            } else if (action.equals("getDeviceSize")) {
                JSONObject res = AndroidCommandHolder.getDeviceSize();
                return getSuccessResult(res);
            } else if (action.equals("find")) {
                String strategy = (String) params.get("strategy");
                String selector = (String) params.get("selector");
                Boolean multiple = (Boolean) params.get("multiple");
                String contextId = (String) params.get("context");
                JSONArray xpathPath = new JSONArray();
                String xpathAttr = "";
                String xpathConstraint = "";
                boolean xpathSubstr = false;
                boolean isXpath = strategy.equals("xpath");
                if (isXpath) {
                    xpathPath = (JSONArray) params.get("path");
                    xpathAttr = (String) params.get("attr");
                    xpathConstraint = (String) params.get("constraint");
                    xpathSubstr = (Boolean) params.get("substr");
                }
                try {
                    if (multiple) {
                        if (isXpath) {
                            return getSuccessResult(AndroidCommandHolder.findElementsByXpath(xpathPath, xpathAttr, xpathConstraint, xpathSubstr, contextId));
                        } else {
                            return getSuccessResult(AndroidCommandHolder.findElements(strategy, selector, contextId));
                        }
                    } else {
                        try {
                            if (isXpath) {
                                return getSuccessResult(AndroidCommandHolder.findElementByXpath(xpathPath, xpathAttr, xpathConstraint, xpathSubstr, contextId));
                            } else {
                                return getSuccessResult(AndroidCommandHolder.findElement(strategy, selector, contextId));
                            }
                        } catch (ElementNotFoundException e) {
                            return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT);
                        }
                    }
                } catch (UiObjectNotFoundException e) {
                    return new AndroidCommandResult(WDStatus.STALE_ELEMENT_REFERENCE);
                }
            } else if (action.startsWith("element:")) {
                action = action.substring(8);
                String elId = (String)params.get("elementId");
                AndroidElement el;
                try {
                    el = AndroidElementsHash.getInstance().getElement(elId);
                } catch (ElementNotInHashException e) {
                    throw new AndroidCommandException(e.getMessage());
                }
                try {
                    if (action.equals("click")) {
                        return getSuccessResult(el.click());
                    } else if (action.equals("getText")) {
                        return getSuccessResult(el.getText());
                    } else if (action.equals("setText")) {
                        String text = params.get("text").toString();
                        return getSuccessResult(el.setText(text));
                    } else {
                        return getErrorResult("Unknown command: element:" + action);
                    }
                } catch (UiObjectNotFoundException e) {
                    return new AndroidCommandResult(WDStatus.STALE_ELEMENT_REFERENCE);
                }
            } else {
                return getErrorResult("Unknown command: " + action);
            }
        } catch (AndroidCommandException e) {
            return getErrorResult(e.getMessage());
        }
    }
    
    private AndroidCommandResult getSuccessResult(Object value) {
        return new AndroidCommandResult(WDStatus.SUCCESS, value);
    }
    
    private AndroidCommandResult getErrorResult(String msg) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, msg);
    }
}