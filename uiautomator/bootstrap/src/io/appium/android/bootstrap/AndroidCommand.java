package io.appium.android.bootstrap;

import org.json.JSONObject;
import org.json.JSONException;

import java.util.Hashtable;
import java.util.Iterator;

//import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.AndroidCommandType;
import io.appium.android.bootstrap.CommandTypeException;


public class AndroidCommand {
    
    JSONObject json;
    AndroidCommandType cmdType;
    
    public AndroidCommand(String jsonStr) throws JSONException, CommandTypeException {
        json = new JSONObject(jsonStr);
        setType(json.getString("cmd"));
    }
    
    public void setType(String stringType) throws CommandTypeException {
        if (stringType.equals("shutdown")) {
            cmdType = AndroidCommandType.SHUTDOWN;
        } else if (stringType.equals("action")){
            cmdType = AndroidCommandType.ACTION;
        } else {
            throw new CommandTypeException("Got bad command type: " + stringType);
        }
    }
    
    public AndroidCommandType commandType() {
        return cmdType;
    }
    
    public String action() throws JSONException {
    	if (this.isElementCommand()) {
    		return json.getString("action").substring(8);
    	}
        return json.getString("action");
    }
    
    public boolean isElementCommand() {
    	if (this.cmdType == AndroidCommandType.ACTION) {
    		try {
				return json.getString("action").startsWith("element:");
			} catch (JSONException e) {
				return false;
			}
    	}
    	return false;
    }
    public Hashtable<String, Object> params() throws JSONException {
        JSONObject paramsObj = json.getJSONObject("params");
        Hashtable<String, Object> newParams = new Hashtable<String, Object>();
        Iterator<?> keys = paramsObj.keys();
        
        while (keys.hasNext()) {
            String param = (String)keys.next();
            newParams.put(param, paramsObj.get(param));
        }
        return newParams;
    }
    
}