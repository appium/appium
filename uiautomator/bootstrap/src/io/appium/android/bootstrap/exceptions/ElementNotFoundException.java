package io.appium.android.bootstrap.exceptions;

public class ElementNotFoundException extends Exception {
    public ElementNotFoundException() {
        super("Could not find an element using supplied strategy");
    }
}
