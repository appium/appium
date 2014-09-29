package io.appium.android.bootstrap;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;

import java.util.ArrayList;
import java.util.Hashtable;
import java.util.regex.Pattern;

/**
 * A cache of elements that the app has seen.
 *
 */
public class AndroidElementsHash {

  private static final Pattern endsWithInstancePattern = Pattern.compile(".*INSTANCE=\\d+]$");

  public static AndroidElementsHash getInstance() {
    if (AndroidElementsHash.instance == null) {
      AndroidElementsHash.instance = new AndroidElementsHash();
    }
    return AndroidElementsHash.instance;
  }

  private final Hashtable<String, AndroidElement> elements;
  private       Integer                           counter;

  private static AndroidElementsHash instance;

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
   */
  public AndroidElement getElement(final String key) {
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
    AndroidElement baseEl;
    baseEl = elements.get(key);
    UiObject el;

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
   * @throws UiObjectNotFoundException
   */
  public ArrayList<AndroidElement> getElements(final UiSelector sel,
                                               final String key) throws UiObjectNotFoundException {
    boolean keepSearching = true;
    final String selectorString = sel.toString();
    final boolean useIndex = selectorString.contains("CLASS_REGEX=");
    final boolean endsWithInstance = endsWithInstancePattern.matcher(selectorString).matches();
    Logger.debug("getElements selector:" + selectorString);
    final ArrayList<AndroidElement> elements = new ArrayList<AndroidElement>();

    // If sel is UiSelector[CLASS=android.widget.Button, INSTANCE=0]
    // then invoking instance with a non-0 argument will corrupt the selector.
    //
    // sel.instance(1) will transform the selector into:
    // UiSelector[CLASS=android.widget.Button, INSTANCE=1]
    //
    // The selector now points to an entirely different element.
    if (endsWithInstance) {
      Logger.debug("Selector ends with instance.");
      // There's exactly one element when using instance.
      UiObject instanceObj = new UiObject(sel);
      if (instanceObj != null && instanceObj.exists()) {
        elements.add(addElement(instanceObj));
      }
      return elements;
    }

    UiObject lastFoundObj;
    final AndroidElement baseEl = this.getElement(key);

    UiSelector tmp;
    int counter = 0;
    while (keepSearching) {
      if (baseEl == null) {
        Logger.debug("Element[" + key + "] is null: (" + counter + ")");

        if (useIndex) {
          Logger.debug("  using index...");
          tmp = sel.index(counter);
        } else {
          tmp = sel.instance(counter);
        }

        Logger.debug("getElements tmp selector:" + tmp.toString());
        lastFoundObj = new UiObject(tmp);
      } else {
        Logger.debug("Element[" + key + "] is " + baseEl.getId() + ", counter: "
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