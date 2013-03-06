package io.appium.android.bootstrap;

public enum AndroidCommandType {
    ACTION, SHUTDOWN;
}

class CommandTypeException extends Exception {
    public CommandTypeException(String msg) {
        super(msg);
    }
}
