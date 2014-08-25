package io.appium.android.bootstrap;

import android.graphics.Rect;
import android.view.MotionEvent.PointerCoords;
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

  public Point getAbsolutePosition(final Double X, final Double Y)
      throws UiObjectNotFoundException, InvalidCoordinatesException {
    final Point point = new Point(X, Y);
    return getAbsolutePosition(point, false);
  }

  public Point getAbsolutePosition(final Double X, final Double Y,
      final boolean boundsChecking) throws UiObjectNotFoundException,
      InvalidCoordinatesException {
    final Point point = new Point(X, Y);
    return getAbsolutePosition(point, boundsChecking);
  }

  public Point getAbsolutePosition(final Point point)
      throws UiObjectNotFoundException, InvalidCoordinatesException {
    return getAbsolutePosition(point, false);
  }

  public Point getAbsolutePosition(final Point point,
      final boolean boundsChecking) throws UiObjectNotFoundException,
      InvalidCoordinatesException {
    final Rect rect = el.getBounds();
    final Point pos = new Point();
    Logger.debug("Element bounds: " + rect.toShortString());

    if (point.x == 0) {
      pos.x = rect.width() * 0.5 + rect.left;
    } else if (point.x <= 1) {
      pos.x = rect.width() * point.x + rect.left;
    } else {
      pos.x = rect.left + point.x;
    }
    if (boundsChecking) {
      if (pos.x > rect.right || pos.x < rect.left) {
        throw new InvalidCoordinatesException("X coordinate ("
            + pos.x.toString() + " is outside of element rect: "
            + rect.toShortString());
      }
    }

    if (point.y == 0) {
      pos.y = rect.height() * 0.5 + rect.top;
    } else if (point.y <= 1) {
      pos.y = rect.height() * point.y + rect.top;
    } else {
      pos.y = rect.left + point.y;
    }
    if (boundsChecking) {
      if (pos.y > rect.bottom || pos.y < rect.top) {
        throw new InvalidCoordinatesException("Y coordinate ("
            + pos.y.toString() + " is outside of element rect: "
            + rect.toShortString());
      }
    }

    return pos;
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
