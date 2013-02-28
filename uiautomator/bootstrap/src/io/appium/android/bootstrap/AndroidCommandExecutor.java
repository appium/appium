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

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidCommandHolder;
import io.appium.android.bootstrap.AndroidCommandException;
import io.appium.android.bootstrap.WDStatus;

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
        
        // TODO: get all this information using introspection, rather than if-elsing everywhere
        try {
            if (action.equals("click")) {
                int x = (Integer) params.get("x");
                int y = (Integer) params.get("y");
                boolean res = AndroidCommandHolder.click(x, y);
                return getSuccessResult(res);
            } else if (action.equals("getDeviceSize")) {
                JSONObject res = AndroidCommandHolder.getDeviceSize();
                return getSuccessResult(res);
            } else if (action.equals("find")) {
                String strategy = (String) params.get("strategy");
                String selector = (String) params.get("selector");
                Boolean multiple = (Boolean) params.get("multiple");
                String contextId = (String) params.get("context");
                if (multiple) {
                    String[] elIds = AndroidCommandHolder.findElements(strategy, selector, contextId);
                    JSONArray res = new JSONArray();
                    for (String elId : elIds) {
                        JSONObject idObj = new JSONObject();
                        idObj.put("ELEMENT",  elId);
                        res.put(idObj);
                    }
                    return getSuccessResult(res);
                } else {
                    try {
                        String elId = AndroidCommandHolder.findElement(strategy, selector, contextId);
                        JSONObject res = new JSONObject();
                        res.put("ELEMENT", elId);
                        return getSuccessResult(res);
                    } catch (UiObjectNotFoundException e) {
                        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT);
                    }
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