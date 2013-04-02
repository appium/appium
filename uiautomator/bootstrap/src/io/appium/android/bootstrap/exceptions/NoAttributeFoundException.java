package io.appium.android.bootstrap.exceptions;

public class NoAttributeFoundException extends Exception {
    public NoAttributeFoundException(String attr) {
        super("This element does not have the '" + attr + "' attribute");
    }
}
