package io.appium.android.bootstrap;

import org.json.JSONObject;
import org.json.JSONException;

import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.AndroidCommandType;


class AndroidCommand {
    
    JSONObject json;
    AndroidCommandType cmdType;
    
    public AndroidCommand(String jsonStr) throws JSONException {
        json = new JSONObject(jsonStr);
        setType(json.getString("cmd"));
    }
    
    public void setType(String stringType) {
        if (stringType.equals("shutdown")) {
            cmdType = AndroidCommandType.SHUTDOWN;
        } else {
            cmdType = AndroidCommandType.COMMAND;
        }
    }
    
    public AndroidCommandType commandType() {
        return cmdType;
    }
    
}