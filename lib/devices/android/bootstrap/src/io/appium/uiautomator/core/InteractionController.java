package io.appium.uiautomator.core;

import android.view.InputEvent;
import android.view.MotionEvent;
import android.view.MotionEvent.PointerCoords;

import static io.appium.android.bootstrap.utils.ReflectionUtils.invoke;
import static io.appium.android.bootstrap.utils.ReflectionUtils.method;

public class InteractionController {

  private static final String CLASS_INTERACTION_CONTROLLER = "com.android.uiautomator.core.InteractionController";
  private static final String METHOD_SEND_KEY = "sendKey";
  private static final String METHOD_INJECT_EVENT_SYNC = "injectEventSync";
  private static final String METHOD_TOUCH_DOWN = "touchDown";
  private static final String METHOD_TOUCH_UP = "touchUp";
  private static final String METHOD_TOUCH_MOVE = "touchMove";
  public static final String METHOD_PERFORM_MULTI_POINTER_GESTURE = "performMultiPointerGesture";

  private final Object interactionController;

  public InteractionController(Object interactionController) {
    this.interactionController = interactionController;
  }

  public boolean sendKey(int keyCode, int metaState){
    return (Boolean) invoke(method(CLASS_INTERACTION_CONTROLLER, METHOD_SEND_KEY, int.class, int.class), interactionController, keyCode, metaState);
  }

  public boolean injectEventSync(InputEvent event) {
    return (Boolean) invoke(method(CLASS_INTERACTION_CONTROLLER, METHOD_INJECT_EVENT_SYNC, InputEvent.class), interactionController, event);
  }

  public boolean touchDown(int x, int y) {
    return (Boolean) invoke(method(CLASS_INTERACTION_CONTROLLER, METHOD_TOUCH_DOWN, int.class, int.class), interactionController, x, y);
  }

  public boolean touchUp(int x, int y) {
    return (Boolean) invoke(method(CLASS_INTERACTION_CONTROLLER, METHOD_TOUCH_UP, int.class, int.class), interactionController, x, y);
  }

  public boolean touchMove(int x, int y) {
    return (Boolean) invoke(method(CLASS_INTERACTION_CONTROLLER, METHOD_TOUCH_MOVE, int.class, int.class), interactionController, x, y);
  }

  public Boolean performMultiPointerGesture(MotionEvent.PointerCoords[][] pcs) {
    return (Boolean) invoke(method(CLASS_INTERACTION_CONTROLLER, METHOD_PERFORM_MULTI_POINTER_GESTURE, PointerCoords[][].class), interactionController, (Object) pcs);
  }
}
