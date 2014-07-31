package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.InvalidStrategyException;
import io.appium.android.bootstrap.exceptions.UiSelectorSyntaxException;
import io.appium.android.bootstrap.selector.Strategy;
import io.appium.android.bootstrap.utils.ElementHelpers;
import io.appium.android.bootstrap.utils.NotImportantViews;
import io.appium.android.bootstrap.utils.UiAutomatorParser;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Hashtable;
import java.util.List;
import java.util.regex.Pattern;

import static io.appium.android.bootstrap.utils.API.API_18;

/**
 * This handler is used to find elements in the Android UI.
 * <p/>
 * Based on which {@link Strategy}, {@link UiSelector}, and optionally the
 * contextId, the element Id or Ids are returned to the user.
 */
public class Find extends CommandHandler {
  // These variables are expected to persist across executions.
  AndroidElementsHash elements = AndroidElementsHash.getInstance();
  Dynamic             dynamic  = new Dynamic();
  static JSONObject apkStrings = null;
  UiAutomatorParser uiAutomatorParser = new UiAutomatorParser();
  /**
   * java_package : type / name
   *
   * com.example.Test:id/enter
   *
   * ^[a-zA-Z_]      - Java package must start with letter or underscore
   * [a-zA-Z0-9\._]* - Java package may contain letters, numbers, periods and underscores
   * :               - : ends the package and starts the type
   * [^\/]+          - type is made up of at least one non-/ characters
   * \\/             - / ends the type and starts the name
   * [\S]+$          - the name contains at least one non-space character and then the line is ended
   */
  static final Pattern resourceIdRegex = Pattern.compile("^[a-zA-Z_][a-zA-Z0-9\\._]*:[^\\/]+\\/[\\S]+$");

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
      strategy = Strategy.fromString((String) params.get("strategy"));
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
        JSONArray pair;
        List<AndroidElement> elementResults = new ArrayList<AndroidElement>();
        final JSONArray jsonResults = new JSONArray();
        // Start at 1 to skip over all.
        for (int selIndex = all || scroll ? 1 : 0; selIndex < selectors
            .length(); selIndex++) {
          Logger.debug("Parsing selector " + selIndex);
          pair = (JSONArray) selectors.get(selIndex);
          Logger.debug("Pair is: " + pair);
          UiSelector sel;
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
                List<AndroidElement> eles = elements.getElements(
                    sel, contextId);
                Logger.debug("Elements found: " + eles);
                for (final String found : Dynamic.finalize(eles, finalizer)) {
                  jsonResults.put(found);
                }
                continue;
              } else {
                final AndroidElement ele = elements.getElement(sel, contextId);
                final String result = Dynamic.finalize(ele, finalizer);
                return getSuccessResult(result);
              }
            }

            if (all) {
              for (AndroidElement e : elements.getElements(sel, contextId)) {
                elementResults.add(e);
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
        } // end for loop
        if (all) {
          // matching on multiple selectors may return duplicate elements
          elementResults = ElementHelpers.dedupe(elementResults);

          for (final AndroidElement el : elementResults) {
            jsonResults.put(new JSONObject().put("ELEMENT", el.getId()));
          }

          return getSuccessResult(jsonResults);
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
    final boolean multiple = (Boolean) params.get("multiple");

    Logger.debug("Finding " + text + " using " + strategy.toString()
        + " with the contextId: " + contextId + " multiple: " + multiple);

    if (strategy == Strategy.INDEX_PATHS) {
      NotImportantViews.discard(true);
      return findElementsByIndexPaths(text, multiple);
    } else {
      NotImportantViews.discard(false);
    }

    try {
      Object result = null;
      List<UiSelector> selectors = getSelectors(strategy, text, multiple);

      if (!multiple) {
        for (final UiSelector sel : selectors) {
          try {
            Logger.debug("Using: " + sel.toString());
            result = fetchElement(sel, contextId);
          } catch (final ElementNotFoundException e) {
          }
          if (result != null) {
            break;
          }
        }
      } else {
        List<AndroidElement> foundElements = new ArrayList<AndroidElement>();
        for (final UiSelector sel : selectors) {
          // With multiple selectors, we expect that some elements may not
          // exist.
          try {
            Logger.debug("Using: " + sel.toString());
            List<AndroidElement> elementsFromSelector = fetchElements(sel, contextId);
            foundElements.addAll(elementsFromSelector);
          } catch (final UiObjectNotFoundException e) {
          }
        }
        if (strategy == Strategy.ANDROID_UIAUTOMATOR) {
          foundElements = ElementHelpers.dedupe(foundElements);
        }
        result = elementsToJSONArray(foundElements);
      }

      // If there are no results, then return an error.
      if (result == null) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            "No element found");
      }

      return getSuccessResult(result);
    } catch (final InvalidStrategyException e) {
      return getErrorResult(e.getMessage());
    } catch (final UiSelectorSyntaxException e) {
      return new AndroidCommandResult(WDStatus.UNKNOWN_COMMAND, e.getMessage());
    } catch (final ElementNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
    }
  }

  /**
   * Get the element from the {@link AndroidElementsHash} and return the element
   * id using JSON.
   *
   * @param sel
   *     A UiSelector that targets the element to fetch.
   * @param contextId
   *     The Id of the element used for the context.
   * @return JSONObject
   * @throws JSONException
   * @throws ElementNotFoundException
   */
  private JSONObject fetchElement(final UiSelector sel, final String contextId)
      throws JSONException, ElementNotFoundException {
    final JSONObject res = new JSONObject();
    final AndroidElement el = elements.getElement(sel, contextId);
    return res.put("ELEMENT", el.getId());
  }

  /**
   * Get a single element by its index and its parent indexes. Used to resolve
   * an xpath query
   *
   * @param indexPath
   * @return
   * @throws ElementNotFoundException
   * @throws JSONException
   */
  private JSONObject fetchElementByClassAndInstance(final String indexPath)
      throws ElementNotFoundException, JSONException {

    // path looks like "className:instanceNumber" eg: "android.widget.Button:2"
    String[] classInstancePair = indexPath.split(":");
    String androidClass = classInstancePair[0];
    String instance = classInstancePair[1];

    UiSelector sel = new UiSelector().className(androidClass).instance(Integer.parseInt(instance));

    return fetchElement(sel, "");
  }

  /**
   * Get an array of AndroidElement objects from the {@link AndroidElementsHash}
   *
   * @param sel
   *     A UiSelector that targets the element to fetch.
   * @param contextId
   *     The Id of the element used for the context.
   * @return ArrayList<AndroidElement>
   * @throws UiObjectNotFoundException
   */
  private ArrayList<AndroidElement> fetchElements(final UiSelector sel, final String contextId)
      throws UiObjectNotFoundException {

    return elements.getElements(sel, contextId);
  }

  /**
   * Get a JSONArray to represent a collection of AndroidElements
   *
   * @param els collection of AndroidElement objects
   * @return elements in the format which appium server returns
   * @throws JSONException
   */
  private JSONArray elementsToJSONArray(List<AndroidElement> els) throws JSONException {
    final JSONArray resArray = new JSONArray();
    for (AndroidElement el : els) {
      resArray.put(ElementHelpers.toJSON(el));
    }
    return resArray;
  }

  /**
   * Get a find element result by looking through the paths of indexes used to
   * retrieve elements from an XPath search
   *
   * @param selector
   * @return
   */
  private AndroidCommandResult findElementsByIndexPaths(final String selector,
                                                        final Boolean multiple) {
    final ArrayList<String> indexPaths = new ArrayList<String>(
        Arrays.asList(selector.split(",")));
    final JSONArray resArray = new JSONArray();
    JSONObject resEl = new JSONObject();
    for (final String indexPath : indexPaths) {
      try {
        resEl = fetchElementByClassAndInstance(indexPath);
        resArray.put(resEl);
      } catch (final JSONException e) {
        return new AndroidCommandResult(WDStatus.UNKNOWN_ERROR, e.getMessage());
      } catch (final ElementNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      }
    }
    if (multiple) {
      return getSuccessResult(resArray);
    } else {
      return getSuccessResult(resEl);
    }
  }

  /**
   * Create and return a UiSelector based on the strategy, text, and how many
   * you want returned.
   *
   * @param strategy
   *     The {@link Strategy} used to search for the element.
   * @param text
   *     Any text used in the search (i.e. match, regex, etc.)
   * @param many
   *     Boolean that is either only one element (false), or many (true)
   * @return UiSelector
   * @throws InvalidStrategyException
   * @throws ElementNotFoundException
   */
  private List<UiSelector> getSelectors(final Strategy strategy,
                                        final String text, final boolean many) throws InvalidStrategyException,
      ElementNotFoundException, UiSelectorSyntaxException {
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
      case ID:
        // There are three types of ids on Android.
        // 1. resourceId (API >= 18)
        // 2. accessibility id (content description)
        // 3. strings.xml id
        //
        // If text is a resource id then only use the resource id selector.
        if (API_18 && resourceIdRegex.matcher(text).matches()) {
          sel = sel.resourceId(text);
          if (!many) {
            sel = sel.instance(0);
          }
          selectors.add(sel);
          break;
        }

        // must create a new selector or the selector from
        // the resourceId search will cause problems
        sel = new UiSelector().description(text);
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);

        // resource id and content description failed to match
        // so the strings.xml selector is used
        UiSelector stringsXmlSelector = stringsXmlId(many, text);
        if (stringsXmlSelector != null) {
          selectors.add(stringsXmlSelector);
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
        sel = new UiSelector().description(text);
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);

        sel = new UiSelector().text(text);
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);
        break;
      case ANDROID_UIAUTOMATOR:
        List<UiSelector> parsedSelectors = new ArrayList<UiSelector>();
        try {
          parsedSelectors = uiAutomatorParser.parse(text);
        } catch (final UiSelectorSyntaxException e) {
          throw new UiSelectorSyntaxException(
              "Could not parse UiSelector argument: " + e.getMessage());
        }

        for (UiSelector selector : parsedSelectors) {
          selectors.add(selector);
        }

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

  /** Returns null on failure to match **/
  private UiSelector stringsXmlId(final boolean many, String text) {
    UiSelector sel = null;
    try {
      final String xmlValue = apkStrings.getString(text);
      if (xmlValue == null || xmlValue.isEmpty()) {
        return null;
      }
      sel = new UiSelector().text(xmlValue);
      if (!many) {
        sel = sel.instance(0);
      }
    } catch (JSONException e) {
    } finally {
      return sel;
    }
  }
}
