package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.ElementNotFoundException;
import io.appium.android.bootstrap.exceptions.InvalidSelectorException;
import io.appium.android.bootstrap.exceptions.InvalidStrategyException;
import io.appium.android.bootstrap.exceptions.UiSelectorSyntaxException;
import io.appium.android.bootstrap.selector.Strategy;
import io.appium.android.bootstrap.utils.ClassInstancePair;
import io.appium.android.bootstrap.utils.ElementHelpers;
import io.appium.android.bootstrap.utils.UiAutomatorParser;
import io.appium.android.bootstrap.utils.XMLHierarchy;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import javax.xml.parsers.ParserConfigurationException;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.NoSuchElementException;
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
    final String text = (String) params.get("selector");
    final boolean multiple = (Boolean) params.get("multiple");
    boolean xpathCompression = XMLHierarchy.DEFAULT_XPATH_COMPRESSION_SETTING;
    if (params.containsKey("xpathCompression")) {
      xpathCompression = (Boolean) params.get("xpathCompression");
    }

    Logger.debug("Finding " + text + " using " + strategy.toString()
        + " with the contextId: " + contextId + " multiple: " + multiple);

    try {
      Object result = null;
      List<UiSelector> selectors = getSelectors(strategy, text, multiple, xpathCompression);

      if (!multiple) {
        for (final UiSelector sel : selectors) {
          try {
            Logger.debug("Using: " + sel.toString());
            result = fetchElement(sel, contextId);
          } catch (final ElementNotFoundException ignored) {
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
          } catch (final UiObjectNotFoundException ignored) {
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
    } catch (ParserConfigurationException e) {
      return getErrorResult("Error parsing xml hierarchy dump: " + e.getMessage());
    } catch (InvalidSelectorException e) {
      return new AndroidCommandResult(WDStatus.INVALID_SELECTOR, e.getMessage());
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
                                        final String text, final boolean many, final boolean xpathCompression) throws InvalidStrategyException,
          ElementNotFoundException, UiSelectorSyntaxException, ParserConfigurationException, InvalidSelectorException {
    final List<UiSelector> selectors = new ArrayList<UiSelector>();
    UiSelector sel = new UiSelector();

    switch (strategy) {
      case XPATH:
        for (UiSelector selector : getXPathSelectors(text, many, xpathCompression)) {
          selectors.add(selector);
        }
        break;
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
        List<UiSelector> parsedSelectors;
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

  /** returns List of UiSelectors for an xpath expression **/
  private List<UiSelector> getXPathSelectors(final String expression, final boolean multiple, final boolean compression) throws ElementNotFoundException, ParserConfigurationException, InvalidSelectorException {
    List<UiSelector> selectors = new ArrayList<UiSelector>();

    ArrayList<ClassInstancePair> pairs = XMLHierarchy.getClassInstancePairs(expression, compression);

    if (!multiple) {
      if (pairs.size() == 0) {
        throw new NoSuchElementException();
      }
      selectors.add(pairs.get(0).getSelector());
    } else {
      for (ClassInstancePair pair : pairs) {
        selectors.add(pair.getSelector());
      }
    }

    return selectors;
  }
}
