package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;
import io.appium.android.bootstrap.utils.Point;
import android.graphics.Rect;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;

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

  public boolean click() throws UiObjectNotFoundException {
    return el.click();
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
    if (boundsChecking == true) {
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
    if (boundsChecking == true) {
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
    boolean res = false;
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

  public String getId() {
    return id;
  }

  public String getStringAttribute(final String attr)
      throws UiObjectNotFoundException, NoAttributeFoundException {
    String res = "";
    if (attr.equals("name")) {
      res = el.getContentDescription();
      if (res.equals("")) {
        res = el.getText();
      }
    } else if (attr.equals("text")) {
      res = el.getText();
    } else {
      throw new NoAttributeFoundException(attr);
    }
    return res;
  }

  public String getText() throws UiObjectNotFoundException {
    return el.getText();
  }

  public void setId(final String id) {
    this.id = id;
  }

  public boolean setText(final String text) throws UiObjectNotFoundException {
    return el.setText(text);
  }

}
