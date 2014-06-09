package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.InvalidStrategyException;
import io.appium.android.bootstrap.exceptions.UiSelectorSyntaxException;
import io.appium.android.bootstrap.exceptions.UnallowedTagNameException;
import io.appium.android.bootstrap.selector.Strategy;
import io.appium.android.bootstrap.utils.ElementHelpers;
import io.appium.android.bootstrap.utils.NotImportantViews;
import io.appium.android.bootstrap.utils.UiSelectorParser;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Hashtable;
import java.util.List;

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
  UiSelectorParser uiSelectorParser = new UiSelectorParser();

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
    final Boolean multiple = (Boolean) params.get("multiple");

    Logger.debug("Finding " + text + " using " + strategy.toString()
        + " with the contextId: " + contextId);

    if (strategy == Strategy.INDEX_PATHS) {
      NotImportantViews.discard(true);
      return findElementsByIndexPaths(text, multiple);
    } else {
      NotImportantViews.discard(false);
    }

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
    } catch (final UiSelectorSyntaxException e) {
      return new AndroidCommandResult(WDStatus.UNKNOWN_COMMAND, e.getMessage());
    } catch (final UiObjectNotFoundException e) {
      return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT, e.getMessage());
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
  private JSONObject fetchElementByIndexPath(final String indexPath)
      throws ElementNotFoundException, JSONException {
    UiSelector sel = new UiSelector().index(0);
    Integer curIndex;
    List<String> paths = Arrays.asList(indexPath.split("/"));
    // throw away the first element since it will be empty, and the second
    // element, since it will refer to the root element, which we already have
    paths = paths.subList(2, paths.size());
    for (final String index : paths) {
      curIndex = Integer.valueOf(index);
      // get a new selector which selects the current selector's child at the
      // correct index
      sel = sel.childSelector(new UiSelector().index(curIndex));
    }
    return fetchElement(sel, "");
  }

  /**
   * Get an array of elements from the {@link AndroidElementsHash} and return
   * the element's ids using JSON.
   *
   * @param sel
   *     A UiSelector that targets the element to fetch.
   * @param contextId
   *     The Id of the element used for the context.
   * @return JSONObject
   * @throws JSONException
   * @throws UiObjectNotFoundException
   */
  private JSONArray fetchElements(final UiSelector sel, final String contextId)
      throws JSONException, UiObjectNotFoundException {
    final JSONArray resArray = new JSONArray();
    final ArrayList<AndroidElement> els = elements.getElements(sel, contextId);
    for (final AndroidElement el : els) {
      resArray.put(new JSONObject().put("ELEMENT", el.getId()));
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
        resEl = fetchElementByIndexPath(indexPath);
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
  private List<UiSelector> getSelector(final Strategy strategy,
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
        if (API_18) {
          sel = sel.resourceId(text);
          if (!many) {
            sel = sel.instance(0);
          }
          if (new UiObject(sel).exists()) {
            selectors.add(sel);
            break;
          }
        }

        // must create a new selector or the selector from
        // the resourceId search will cause problems
        sel = new UiSelector().description(text);
        if (!many) {
          sel = sel.instance(0);
        }
        if (new UiObject(sel).exists()) {
          selectors.add(sel);
          break;
        }

        // resource id and content description failed to match
        // so the strings.xml selector is used
        selectors.add(stringsXmlId(many, text));
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
      case ANDROID_UIAUTOMATOR:
        try {
          sel = uiSelectorParser.parse(text);
        } catch (final UiSelectorSyntaxException e) {
          throw new UiSelectorSyntaxException(
              "Could not parse UiSelector argument: " + e.getMessage());
        }
        if (!many) {
          sel = sel.instance(0);
        }
        selectors.add(sel);
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