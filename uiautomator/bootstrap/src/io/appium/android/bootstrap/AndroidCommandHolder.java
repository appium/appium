package io.appium.android.bootstrap;

import org.json.JSONObject;
import org.json.JSONException;

import com.android.uiautomator.core.UiDevice;

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

}