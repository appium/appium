package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;

import java.util.ArrayList;
import java.util.Hashtable;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;

/**
 * A cache of elements that the app has seen.
 * 
 */
public class AndroidElementsHash {

  /**
   * @return
   */
  public static AndroidElementsHash getInstance() {
    if (AndroidElementsHash.instance == null) {
      AndroidElementsHash.instance = new AndroidElementsHash();
    }
    return AndroidElementsHash.instance;
  }

  private final Hashtable<String, AndroidElement> elements;
  private Integer                                 counter;

  private static AndroidElementsHash              instance;

  /**
   * Constructor
   */
  public AndroidElementsHash() {
    counter = 0;
    elements = new Hashtable<String, AndroidElement>();
  }

  /**
   * @param element
   * @return
   */
  public AndroidElement addElement(final UiObject element) {
    counter++;
    final String key = counter.toString();
    final AndroidElement el = new AndroidElement(key, element);
    elements.put(key, el);
    return el;
  }

  /**
   * Return an element given an Id.
   * 
   * @param key
   * @return {@link AndroidElement}
   * @throws ElementNotInHashException
   */
  public AndroidElement getElement(final String key)
      throws ElementNotInHashException {
    return elements.get(key);
  }

  /**
   * Return an elements child given the key (context id), or uses the selector
   * to get the element.
   * 
   * @param sel
   * @param key
   *          Element id.
   * @return {@link AndroidElement}
   * @throws ElementNotFoundException
   */
  public AndroidElement getElement(final UiSelector sel, final String key)
      throws ElementNotFoundException {
    AndroidElement baseEl = null;
    baseEl = elements.get(key);
    UiObject el = null;

    if (baseEl == null) {
      el = new UiObject(sel);
    } else {
      try {
        el = baseEl.getChild(sel);
      } catch (final UiObjectNotFoundException e) {
        throw new ElementNotFoundException();
      }
    }

    if (el.exists()) {
      return addElement(el);
    } else {
      throw new ElementNotFoundException();
    }
  }

  /**
   * Same as {@link #getElement(UiSelector, String)} but for multiple elements
   * at once.
   * 
   * @param sel
   * @param key
   * @return ArrayList<{@link AndroidElement}>
   * @throws ElementNotInHashException
   * @throws UiObjectNotFoundException
   */
  public ArrayList<AndroidElement> getElements(final UiSelector sel,
      final String key) throws ElementNotInHashException,
      UiObjectNotFoundException {
    boolean keepSearching = true;
    final boolean useIndex = sel.toString().contains("CLASS_REGEX=");
    final ArrayList<AndroidElement> elements = new ArrayList<AndroidElement>();
    UiObject lastFoundObj = null;
    final AndroidElement baseEl = this.getElement(key);

    UiSelector tmp = null;
    int counter = 0;
    while (keepSearching) {
      if (baseEl == null) {
        Logger.info("Element[" + key + "] is null: (" + counter + ")");
        if (useIndex) {
          Logger.info("  using index...");
          tmp = sel.index(counter);
        } else {
          tmp = sel.instance(counter);
        }
        lastFoundObj = new UiObject(tmp);
      } else {
        Logger.info("Element[" + key + "] is " + baseEl.getId() + ", counter: "
            + counter);
        lastFoundObj = baseEl.getChild(sel.instance(counter));
      }
      counter++;
      if (lastFoundObj != null && lastFoundObj.exists()) {
        elements.add(addElement(lastFoundObj));
      } else {
        keepSearching = false;
      }
    }
    return elements;
  }
}