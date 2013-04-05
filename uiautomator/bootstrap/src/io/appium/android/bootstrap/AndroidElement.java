package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.NoAttributeFoundException;
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
