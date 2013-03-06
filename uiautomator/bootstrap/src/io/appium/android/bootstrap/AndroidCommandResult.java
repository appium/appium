package io.appium.android.bootstrap;

import org.json.JSONObject;
import org.json.JSONException;

import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;

class AndroidCommandResult {
    
    JSONObject json;
    
    public AndroidCommandResult(WDStatus status, JSONObject val) {
        json = new JSONObject();
        try {
            json.put("status", status.code());
            json.put("value", val);
        } catch (JSONException e) {
            Logger.error("Couldn't create android command result!");
        }
    }
    
    public AndroidCommandResult(WDStatus status, Object val) {
        json = new JSONObject();
        try {
            json.put("status", status.code());
            json.put("value", val);
        } catch (JSONException e) {
            Logger.error("Couldn't create android command result!");
        }
    }
    
    public AndroidCommandResult(WDStatus status, String val) {
        try {
            json = new JSONObject();
            json.put("status", status.code());
            json.put("value", val);
        } catch (JSONException e) {
            Logger.error("Couldn't create android command result!");
        }
    }
    
    public AndroidCommandResult(WDStatus status) {
        try {
            json = new JSONObject();
            json.put("status", status.code());
            json.put("value", status.message());
        } catch (JSONException e) {
            Logger.error("Couldn't create android command result!");
        }
    }
    
    public String toString() {
        return json.toString();
    }
    
}