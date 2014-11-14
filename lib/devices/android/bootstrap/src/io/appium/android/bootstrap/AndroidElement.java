package io.appium.android.bootstrap;

import android.graphics.Rect;
import android.view.MotionEvent.PointerCoords;
import android.view.accessibility.AccessibilityNodeInfo;
import com.android.uiautomator.common.ReflectionUtils;
import com.android.uiautomator.core.Configurator;
import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;
import io.appium.android.bootstrap.utils.Point;
import io.appium.android.bootstrap.utils.UnicodeEncoder;

import java.lang.reflect.Method;

import static io.appium.android.bootstrap.utils.API.API_18;

/**
 * Proxy class for UiObject.
 *
 */
public class AndroidElement {

  private final Configurator mConfig = Configurator.getInstance();

  private final UiObject el;
  private String         id;

  AndroidElement(final String id, final UiObject el) {
    this.el = el;
    this.id = id;
  }

  public AndroidElement(final UiObject uiObj) {
    el = uiObj;
  }

  public void clearText() throws UiObjectNotFoundException {
    el.clearTextField();
  }

  public boolean click() throws UiObjectNotFoundException {
    return el.click();
  }
  
  public boolean exists() {
    return el.exists();
  }

  public boolean dragTo(final int destX, final int destY, final int steps)
      throws UiObjectNotFoundException {
    if (API_18) {
      return el.dragTo(destX, destY, steps);
    } else {
      Logger.error("Device does not support API >= 18!");
      return false;
    }
  }

  public boolean dragTo(final UiObject destObj, final int steps)
      throws UiObjectNotFoundException {
    if (API_18) {
      return el.dragTo(destObj, steps);
    } else {
      Logger.error("Device does not support API >= 18!");
      return false;
    }
  }
  
  public Point getAbsolutePosition(final Point point)
      throws UiObjectNotFoundException, InvalidCoordinatesException {
    final Rect rect = this.getBounds();
    
    Logger.debug("Element bounds: " + rect.toShortString());
    
    return PositionHelper.getAbsolutePosition(point, rect, new Point(rect.left, rect.top), false);
  }

  public boolean getBoolAttribute(final String attr)
      throws UiObjectNotFoundException, NoAttributeFoundException {
    boolean res;
    if (attr.equals("enabled")) {
      res = el.isEnabled();
    } else if (attr.equals("checkable")) {
      res = el.isCheckable();
    } else if (attr.equals("checked")) {
      res = el.isChecked();
    } else if (attr.equals("clickable")) {
      res = el.isClickable();
    } else if (attr.equals("focusable")) {
      res = el.isFocusable();
    } else if (attr.equals("focused")) {
      res = el.isFocused();
    } else if (attr.equals("longClickable")) {
      res = el.isLongClickable();
    } else if (attr.equals("scrollable")) {
      res = el.isScrollable();
    } else if (attr.equals("selected")) {
      res = el.isSelected();
    } else if (attr.equals("displayed")) {
      res = el.exists();
    } else {
      throw new NoAttributeFoundException(attr);
    }
    return res;
  }

  public Rect getBounds() throws UiObjectNotFoundException {
    return el.getBounds();
  }

  public UiObject getChild(final UiSelector sel)
      throws UiObjectNotFoundException {
    return el.getChild(sel);
  }

  public String getClassName() throws UiObjectNotFoundException {
    if (API_18) {
      return el.getClassName();
    } else {
      Logger.error("Device does not support API >= 18!");
      return "";
    }
  }

  public String getResourceId() throws UiObjectNotFoundException {
    String resourceId = "";

    if (!API_18) {
      Logger.error("Device does not support API >= 18!");
      return resourceId;
    }

    try {
      /*
       * Unfortunately UiObject does not implement a getResourceId method.
       * There is currently no way to determine the resource-id of a given
       * element represented by UiObject. Until this support is added to
       * UiAutomater, we try to match the implementation pattern that is
       * already used by UiObject for getting attributes using reflection.
       * The returned string matches exactly what is displayed in the
       * UiAutomater inspector.
       */
      ReflectionUtils utils = new ReflectionUtils();
      Method method = utils.getMethod(el.getClass(), "findAccessibilityNodeInfo", long.class);

      AccessibilityNodeInfo node = (AccessibilityNodeInfo)method.invoke(el, mConfig.getWaitForSelectorTimeout());

      if (node == null) {
        throw new UiObjectNotFoundException(el.getSelector().toString());
      }

      resourceId = node.getViewIdResourceName();
    } catch (final Exception e) {
      Logger.error("Exception: " + e + " (" + e.getMessage() + ")");
    }

    return resourceId;
  }

  public String getContentDesc() throws UiObjectNotFoundException {
    return el.getContentDescription();
  }

  public String getId() {
    return id;
  }

  public String getStringAttribute(final String attr)
      throws UiObjectNotFoundException, NoAttributeFoundException {
    String res;
    if (attr.equals("name")) {
      res = getContentDesc();
      if (res.equals("")) {
        res = getText();
      }
    } else if (attr.equals("text")) {
      res = getText();
    } else if (attr.equals("className")) {
      res = getClassName();
    } else if (attr.equals("resourceId")) {
      res = getResourceId();
    } else {
      throw new NoAttributeFoundException(attr);
    }
    return res;
  }

  public String getText() throws UiObjectNotFoundException {
    return el.getText();
  }

  public UiObject getUiObject() {
    return el;
  }

  public Rect getVisibleBounds() throws UiObjectNotFoundException {
    return el.getVisibleBounds();
  }

  public boolean longClick() throws UiObjectNotFoundException {
    return el.longClick();
  }

  public boolean pinchIn(final int percent, final int steps)
      throws UiObjectNotFoundException {
    if (API_18) {
      return el.pinchIn(percent, steps);
    } else {
      Logger.error("Device does not support API >= 18!");
      return false;
    }
  }

  public boolean pinchOut(final int percent, final int steps)
      throws UiObjectNotFoundException {
    if (API_18) {
      return el.pinchOut(percent, steps);
    } else {
      Logger.error("Device does not support API >= 18!");
      return false;
    }
  }

  public void setId(final String id) {
    this.id = id;
  }

  public boolean setText(final String text) throws UiObjectNotFoundException {
    return setText(text, false);
  }

  public boolean setText(final String text, boolean unicodeKeyboard)
      throws UiObjectNotFoundException {
    if (unicodeKeyboard && UnicodeEncoder.needsEncoding(text)) {
      Logger.debug("Sending Unicode text to element: " + text);
      String encodedText = UnicodeEncoder.encode(text);
      Logger.debug("Encoded text: " + encodedText);
      return el.setText(encodedText);
    } else {
      Logger.debug("Sending plain text to element: " + text);
      return el.setText(text);
    }
  }

  public boolean performMultiPointerGesture(PointerCoords[] ...touches) {
    try {
      if (API_18) {
        // The compile-time SDK expects the wrong arguments, but the runtime
        // version in the emulator is correct. So we cannot do:
        //   `return el.performMultiPointerGesture(touches);`
        // Instead we need to use Reflection to do it all at runtime.
        Method method = this.el.getClass().getMethod("performMultiPointerGesture", PointerCoords[][].class);
        Boolean rt = (Boolean)method.invoke(this.el, (Object)touches);
        return rt;
      } else {
        Logger.error("Device does not support API < 18!");
        return false;
      }
    } catch (final Exception e) {
      Logger.error("Exception: " + e + " (" + e.getMessage() + ")");
      return false;
    }
  }
}
