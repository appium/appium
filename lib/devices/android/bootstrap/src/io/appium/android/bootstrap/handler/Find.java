package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.AndroidElementClassMap;
import io.appium.android.bootstrap.AndroidElementsHash;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Dynamic;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.WDStatus;
import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;
import io.appium.android.bootstrap.exceptions.InvalidStrategyException;
import io.appium.android.bootstrap.exceptions.UnallowedTagNameException;
import io.appium.android.bootstrap.selector.Strategy;

import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.os.Build;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;

/**
 * This handler is used to find elements in the Android UI.
 *
 * Based on which {@link Strategy}, {@link UiSelector}, and optionally the
 * contextId, the element Id or Ids are returned to the user.
 *
 */
public class Find extends CommandHandler {
  // These variables are expected to persist across executions.
  AndroidElementsHash      elements   = AndroidElementsHash.getInstance();
  Dynamic                  dynamic    = new Dynamic();
  public static JSONObject apkStrings = null;

  private Object[] cascadeChildSels(final ArrayList<UiSelector> tail,
      final ArrayList<String> tailOuts) {
    if (tail.size() == 1) {
      final Object[] retVal = { tail.get(0), tailOuts.get(0) };
      return retVal;
    } else {
      final UiSelector head = tail.remove(0);
      final String headOut = tailOuts.remove(0);
      final Object[] res = cascadeChildSels(tail, tailOuts);
      final Object[] retVal = { head.childSelector((UiSelector) res[0]),
          headOut + ".childSelector(" + (String) res[1] + ")" };
      return retVal;
    }
  }

  /*
   * @param command The {@link AndroidCommand} used for this handler.
   *
   * @return {@link AndroidCommandResult}
   *
   * @throws JSONException
   *
   * @see io.appium.android.bootstrap.CommandHandler#execute(io.appium.android.
   * bootstrap.AndroidCommand)
   */
  @Override
  public AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException {
    final Hashtable<String, Object> params = command.params();

    // only makes sense on a device
    final Strategy strategy;
    try {
       strategy = Strategy.fromString((String) params
          .get("strategy"));
    } catch (final InvalidStrategyException e) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_COMMAND, e.getMessage());
    }
    final String contextId = (String) params.get("context");

    if (strategy == Strategy.DYNAMIC) {
      Logger.debug("Finding dynamic.");
      final JSONArray selectors = (JSONArray) params.get("selector");
      final String option = selectors.get(0).toString().toLowerCase();
      final boolean all = option.contentEquals("all");
      Logger.debug("Returning all? " + all);
      UiScrollable scrollable = null;
      final boolean scroll = option.contentEquals("scroll");
      boolean canScroll = true;
      if (scroll) {
        UiSelector scrollableListView = new UiSelector().className(
            android.widget.ListView.class).scrollable(true);
        if (!new UiObject(scrollableListView).exists()) {
          // Select anything that's scrollable if there's no list view.
          scrollableListView = new UiSelector().scrollable(true);
        }

        // Nothing scrollable exists.
        if (!new UiObject(scrollableListView).exists()) {
          // we're not going to scroll
          canScroll = false;
        }

        scrollable = new UiScrollable(scrollableListView).setAsVerticalList();
      }
      Logger.debug("Scrolling? " + scroll);
      // Return the first element of the first selector that matches.
      Logger.debug(selectors.toString());
      try {
        int finalizer = 0;
        JSONArray pair = null;
        final JSONArray results = new JSONArray();
        // Start at 1 to skip over all.
        for (int selIndex = all || scroll ? 1 : 0; selIndex < selectors
            .length(); selIndex++) {
          Logger.debug("Parsing selector " + selIndex);
          pair = (JSONArray) selectors.get(selIndex);
          Logger.debug("Pair is: " + pair);
          UiSelector sel = null;
          // 100+ int represents a method called on the element
          // after the element has been found.
          // [[4,"android.widget.EditText"],[100]] => 100
          final int int0 = pair.getJSONArray(pair.length() - 1).getInt(0);
          Logger.debug("int0: " + int0);
          sel = dynamic.get(pair);
          Logger.debug("Selector: " + sel.toString());
          if (int0 >= 100) {
            finalizer = int0;
            Logger.debug("Finalizer " + Integer.toString(int0));
          }
          try {
            // fetch will throw on not found.
            if (finalizer != 0) {
              if (all) {
                Logger.debug("Finding all with finalizer");
                final ArrayList<AndroidElement> eles = elements.getElements(
                    sel, contextId);
                Logger.debug("Elements found: " + eles);
                for (final String found : Dynamic.finalize(eles, finalizer)) {
                  results.put(found);
                }
                continue;
              } else {
                final AndroidElement ele = elements.getElement(sel, contextId);
                final String result = Dynamic.finalize(ele, finalizer);
                return getSuccessResult(result);
              }
            }

            if (all) {
              final ArrayList<AndroidElement> els = elements.getElements(sel,
                  contextId);
              for (final AndroidElement el : els) {
                results.put(new JSONObject().put("ELEMENT", el.getId()));
              }
              continue;
            } else if (scroll && canScroll) {
              Logger.debug("Scrolling into view...");
              final boolean result = scrollable.scrollIntoView(sel);
              if (!result) {
                continue; // try scrolling next selector
              }
              // return the element we've scrolled to
              return getSuccessResult(fetchElement(sel, contextId));
            } else {
              return getSuccessResult(fetchElement(sel, contextId));
            }
          } catch (final ElementNotFoundException enf) {
            Logger.debug("Not found.");
          }
        }
        if (all && results.length() > 0) {
          return getSuccessResult(results);
        }
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            "No such element.");
      } catch (final Exception e) {
        final String errorMessage = e.getMessage();
        if (errorMessage != null
            && errorMessage
                .contains("UiAutomationService not connected. Did you call #register()?")) {
          // Crash on not connected so Appium restarts the bootstrap jar.
          throw new RuntimeException(e);
        }
        return getErrorResult(errorMessage);
      }
    }

    final String text = (String) params.get("selector");

    Logger.debug("Finding " + text + " using " + strategy.toString()
        + " with the contextId: " + contextId);

    final Boolean multiple = (Boolean) params.get("multiple");
    final boolean isXpath = strategy.equalsIgnoreCase("xpath");

    if (isXpath) {
      final JSONArray xpathPath = (JSONArray) params.get("path");
      final String xpathAttr = (String) params.get("attr");
      final String xpathConstraint = (String) params.get("constraint");
      final Boolean xpathSubstr = (Boolean) params.get("substr");

      try {
        if (multiple) {
          final UiSelector sel = getSelectorForXpath(xpathPath, xpathAttr,
              xpathConstraint, xpathSubstr);
          return getSuccessResult(fetchElements(sel, contextId));
        } else {
          final UiSelector sel = getSelectorForXpath(xpathPath, xpathAttr,
              xpathConstraint, xpathSubstr);
          return getSuccessResult(fetchElement(sel, contextId));
        }
      } catch (final AndroidCommandException e) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
      } catch (final ElementNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final UnallowedTagNameException e) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
      } catch (final ElementNotInHashException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    } else {
      try {
        Object result = null;
        final JSONArray array = new JSONArray();
        for (final UiSelector sel : getSelector(strategy, text, multiple)) {
          // With multiple selectors, we expect that some elements may not
          // exist.
          try {
            if (!multiple) {
              result = fetchElement(sel, contextId);
              // Return first element when multiple is false.
              if (result != null) {
                break;
              }
            } else {
              final JSONArray results = fetchElements(sel, contextId);
              for (int a = 0, len = results.length(); a < len; a++) {
                array.put(results.get(a));
              }
            }
          } catch (final ElementNotInHashException e) {
          } catch (final ElementNotFoundException e) {
          }
        }

        if (multiple) {
          result = array;
        }

        // If there are no results, then return an error.
        if (result == null) {
          return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
              "No element found");
        }

        return getSuccessResult(result);
      } catch (final InvalidStrategyException e) {
        return getErrorResult(e.getMessage());
      } catch (final UnallowedTagNameException e) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
      } catch (final AndroidCommandException e) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final ElementNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    }
  }

  /**
   * Get the element from the {@link AndroidElementsHash} and return the element
   * id using JSON.
   *
   * @param sel
   *          A UiSelector that targets the element to fetch.
   * @param contextId
   *          The Id of the element used for the context.
   *
   * @return JSONObject
   * @throws JSONException
   * @throws ElementNotFoundException
   * @throws ElementNotInHashException
   */
  private JSONObject fetchElement(final UiSelector sel, final String contextId)
      throws JSONException, ElementNotFoundException, ElementNotInHashException {
    final JSONObject res = new JSONObject();
    final AndroidElement el = elements.getElement(sel, contextId);
    return res.put("ELEMENT", el.getId());
  }

  /**
   * Get an array of elements from the {@link AndroidElementsHash} and return
   * the element's ids using JSON.
   *
   * @param sel
   *          A UiSelector that targets the element to fetch.
   * @param contextId
   *          The Id of the element used for the context.
   *
   * @return JSONObject
   * @throws JSONException
   * @throws UiObjectNotFoundException
   * @throws ElementNotInHashException
   */
  private JSONArray fetchElements(final UiSelector sel, final String contextId)
      throws JSONException, ElementNotInHashException,
      UiObjectNotFoundException {
    final JSONArray resArray = new JSONArray();
    final ArrayList<AndroidElement> els = elements.getElements(sel, contextId);
    for (final AndroidElement el : els) {
      resArray.put(new JSONObject().put("ELEMENT", el.getId()));
    }
    return resArray;
  }

  /**
   * Create and return a UiSelector based on the strategy, text, and how many
   * you want returned.
   *
   * @param strategy
   *          The {@link Strategy} used to search for the element.
   * @param text
   *          Any text used in the search (i.e. match, regex, etc.)
   * @param many
   *          Boolean that is either only one element (false), or many (true)
   * @return UiSelector
   * @throws InvalidStrategyException
   * @throws AndroidCommandException
   * @throws ElementNotFoundException
   */
  private List<UiSelector> getSelector(final Strategy strategy,
      final String text, final boolean many) throws InvalidStrategyException,
      AndroidCommandException, UnallowedTagNameException,
      ElementNotFoundException {
    final List<UiSelector> selectors = new ArrayList<UiSelector>();
    UiSelector sel = new UiSelector();

    switch (strategy) {
      case CLASS_NAME:
        sel = sel.className(text);
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);
        break;
      case TAG_NAME:
        final String androidClass = AndroidElementClassMap.match(text);
        sel = sel.className(androidClass);
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);
        // Find both Button and ImageButton when tag name is button
        if (androidClass.contentEquals("android.widget.Button")) {
          UiSelector sel2 = new UiSelector()
              .className("android.widget.ImageButton");
          if (!many) {
            sel2 = sel2.instance(0);
          }
          selectors.add(sel2);
        }
        break;
      case ID:
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
          // Handle this as a resource id
          sel = sel.resourceId(text);
          if (!many) {
            sel = sel.instance(0);
          }

          // Fall back to strings.xml id
          if (!new UiObject(sel).exists()) {
            sel = stringsXmlId(many, text);
          }

          if (sel != null) {
            selectors.add(sel);
          }
        } else {
          sel = stringsXmlId(many, text);
          if (sel != null) {
            selectors.add(sel);
          }
        }
        break;
      case ACCESSIBILITY_ID:
        sel = sel.description(text);
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);
        break;
      case NAME:
        sel = selectNameOrText(many, text);
        selectors.add(sel);
        break;
      case XPATH:
        break;
      case LINK_TEXT:
      case PARTIAL_LINK_TEXT:
      case CSS_SELECTOR:
      default:
        throw new InvalidStrategyException("Sorry, we don't support the '"
            + strategy.getStrategyName() + "' locator strategy yet");
    }

    return selectors;
  }

  /**
   * Create and return a UiSelector based on Xpath attributes.
   *
   * @param path
   *          The Xpath path.
   * @param attr
   *          The attribute.
   * @param constraint
   *          Any constraint.
   * @param substr
   *          Any substr.
   *
   * @return UiSelector
   * @throws AndroidCommandException
   */
  private UiSelector getSelectorForXpath(final JSONArray path,
      final String attr, final String constraint, final boolean substr)
      throws AndroidCommandException, UnallowedTagNameException {
    UiSelector s = new UiSelector();
    final ArrayList<UiSelector> subSels = new ArrayList<UiSelector>();
    final ArrayList<String> subSelOuts = new ArrayList<String>();
    JSONObject pathObj;
    String nodeType;
    Object nodeIndex;
    final String substrStr = substr ? "true" : "false";
    Logger.info("Building xpath selector from attr " + attr
        + " and constraint " + constraint + " and substr " + substrStr);
    String selOut = "s";

    // $driver.find_element :xpath, %(//*[contains(@text, 'agree')])
    // info: [ANDROID] [info] Building xpath selector from attr text and
    // constraint agree and substr true
    // info: [ANDROID] [info] s.className('*').textContains('agree')
    try {
      nodeType = path.getJSONObject(0).getString("node");
    } catch (final JSONException e) {
      throw new AndroidCommandException(
          "Error parsing xpath path obj from JSON");
    }

    if (attr.toLowerCase().contentEquals("text") && !constraint.isEmpty()
        && substr == true && nodeType.contentEquals("*") == true) {
      selOut += ".textContains('" + constraint + "')";
      s = s.textContains(constraint);
      Logger.info(selOut);
      return s;
    }

    // Returns all elements of one class.
    // //*[contains(@tag, "android.widget.Button")]
    if (attr.toLowerCase().contentEquals("tag") && !constraint.isEmpty()
        && substr == true && nodeType.contentEquals("*") == true) {
      selOut += ".className('" + constraint + "')";
      s = s.className(constraint);
      Logger.info(selOut);
      return s;
    }

    for (Integer i = 0; i < path.length(); i++) {
      UiSelector subSel = new UiSelector();
      String subSelOut = "s" + i.toString();
      try {
        pathObj = path.getJSONObject(i);
        nodeType = pathObj.getString("node");
        nodeIndex = pathObj.get("index");
      } catch (final JSONException e) {
        throw new AndroidCommandException(
            "Error parsing xpath path obj from JSON");
      }
      nodeType = AndroidElementClassMap.match(nodeType);
      subSel = subSel.className(nodeType);
      subSelOut += ".className('" + nodeType + "')";

      try {
        Integer nodeIndexInt = (Integer) nodeIndex;
        if (nodeIndexInt == -1) {
          nodeIndexInt = elements.getElements(subSel, "").size();
        }
        nodeIndexInt -= 1;
        subSel = subSel.instance(nodeIndexInt);
        subSelOut += ".instance(" + nodeIndexInt.toString() + ")";
      } catch (final Exception e) {
        // nodeIndex was null
      }
      subSels.add(subSel);
      subSelOuts.add(subSelOut);
    }
    final Object[] cascadeResult = cascadeChildSels(subSels, subSelOuts);
    s = (UiSelector) cascadeResult[0];
    selOut = (String) cascadeResult[1];
    if (attr.equals("desc") || attr.equals("name")) {
      selOut += ".description";
      if (substr) {
        selOut += "Contains";
        s = s.descriptionContains(constraint);
      } else {
        s = s.description(constraint);
      }
      selOut += "('" + constraint + "')";
    } else if (attr.equals("text") || attr.equals("value")) {
      selOut += ".text";
      if (substr) {
        selOut += "Contains";
        s = s.textContains(constraint);
      } else {
        s = s.text(constraint);
      }
      selOut += "('" + constraint + "')";
    }
    Logger.info(selOut);
    return s;
  }

  private UiSelector selectNameOrText(final boolean many, final String text) {
    UiSelector sel = new UiSelector();
    sel = sel.description(text);
    if (!many) {
      sel = sel.instance(0);
    }
    if (!new UiObject(sel).exists()) {
      // now try and find it using the text attribute
      sel = new UiSelector().text(text);
      if (!many) {
        sel = sel.instance(0);
      }
    }
    return sel;
  }

  private UiSelector stringsXmlId(final boolean many, String text)
      throws ElementNotFoundException {
    UiSelector sel = null;
    try {
      final String xmlValue = apkStrings.getString(text);
      sel = selectNameOrText(many, xmlValue);
      // JSONException and NullPointerException
    } catch (final Exception e) {
      if (text == null) {
        text = "";
      }
      // find_elements returns an empty array, not an exception
      if (!many) {
        throw new ElementNotFoundException("ID `" + text
            + "` doesn't exist as text or content desc.");
      }
    }
    return sel;
  }
}
