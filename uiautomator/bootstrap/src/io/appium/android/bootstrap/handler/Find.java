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

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.android.uiautomator.core.UiObjectNotFoundException;
import com.android.uiautomator.core.UiSelector;

/**
 * This handler is used to find elements in the Android UI.
 * 
 * Based on which {@link Strategy}, {@link UiSelector}, and optionally the
 * contextId, the element Id or Ids are returned to the user.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class Find extends CommandHandler {
  AndroidElementsHash elements = AndroidElementsHash.getInstance();
  Dynamic             dynamic  = new Dynamic();

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
    final Strategy strategy = Strategy.fromString((String) params
        .get("strategy"));
    final String contextId = (String) params.get("context");

    if (strategy == Strategy.DYNAMIC) {
      Logger.debug("Finding dynamic.");
      final JSONArray selectors = (JSONArray) params.get("selector");
      // Return the first element of the first selector that matches.
      JSONObject result = new JSONObject();
      Logger.debug(selectors.toString());
      try {
        for (int selIndex = 0; selIndex < selectors.length(); selIndex++) {
          final UiSelector sel = dynamic.get((JSONArray) selectors
              .get(selIndex));
          Logger.debug(sel.toString());
          try {
            // fetch will throw on not found.
            result = fetchElement(sel, contextId);
            return getSuccessResult(result);
          } catch (final ElementNotFoundException enf) {
            Logger.debug("Not found.");
          }
        }
        return getSuccessResult(new AndroidCommandResult(
            WDStatus.NO_SUCH_ELEMENT, "No element found."));
      } catch (final Exception e) {
        return getErrorResult(e.getMessage());
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
        return getErrorResult(e.getMessage());
      } catch (final ElementNotFoundException e) {
        return getErrorResult(e.getMessage());
      } catch (final UnallowedTagNameException e) {
        return getErrorResult(e.getMessage());
      } catch (final ElementNotInHashException e) {
        return getErrorResult(e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult(e.getMessage());
      }
    } else {
      try {
        final UiSelector sel = getSelector(strategy, text, multiple);
        if (multiple) {
          return getSuccessResult(fetchElements(sel, contextId));
        } else {
          return getSuccessResult(fetchElement(sel, contextId));
        }
      } catch (final InvalidStrategyException e) {
        return getErrorResult(e.getMessage());
      } catch (final ElementNotFoundException e) {
        return new AndroidCommandResult(WDStatus.NO_SUCH_ELEMENT,
            e.getMessage());
      } catch (final UnallowedTagNameException e) {
        return getErrorResult(e.getMessage());
      } catch (final AndroidCommandException e) {
        return getErrorResult(e.getMessage());
      } catch (final ElementNotInHashException e) {
        return getErrorResult(e.getMessage());
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult(e.getMessage());
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
   */
  private UiSelector getSelector(final Strategy strategy, final String text,
      final Boolean many) throws InvalidStrategyException,
      AndroidCommandException, UnallowedTagNameException {
    UiSelector sel = new UiSelector();

    switch (strategy) {
      case CLASS_NAME:
      case TAG_NAME:
        String androidClass = AndroidElementClassMap.match(text);
        if (androidClass.contentEquals("android.widget.Button")) {
          androidClass += "|android.widget.ImageButton";
          androidClass = androidClass.replaceAll("([^\\p{Alnum}|])", "\\\\$1");
          sel = sel.classNameMatches("^" + androidClass + "$");
        } else {
          sel = sel.className(androidClass);
        }
        break;
      case NAME:
        sel = sel.description(text);
        break;
      case XPATH:
        break;
      case LINK_TEXT:
      case PARTIAL_LINK_TEXT:
      case ID:
      case CSS_SELECTOR:
      default:
        throw new InvalidStrategyException("Strategy "
            + strategy.getStrategyName() + " is not valid.");
    }

    if (!many) {
      sel = sel.instance(0);
    }
    return sel;
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
      final String attr, String constraint, final boolean substr)
      throws AndroidCommandException, UnallowedTagNameException {
    UiSelector s = new UiSelector();
    JSONObject pathObj;
    String nodeType;
    String searchType;
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

    // //*[contains(@tag, "button")]
    if (attr.toLowerCase().contentEquals("tag") && !constraint.isEmpty()
        && substr == true && nodeType.contentEquals("*") == true) {
      // (?i) = case insensitive match. Esape everything that isn't an
      // alpha num.
      // use .* to match on contains.
      constraint = "(?i)^.*"
          + constraint.replaceAll("([^\\p{Alnum}])", "\\\\$1") + ".*$";
      selOut += ".classNameMatches('" + constraint + "')";
      s = s.classNameMatches(constraint);
      Logger.info(selOut);
      return s;
    }

    for (int i = 0; i < path.length(); i++) {
      try {
        pathObj = path.getJSONObject(i);
        nodeType = pathObj.getString("node");
        searchType = pathObj.getString("search");
      } catch (final JSONException e) {
        throw new AndroidCommandException(
            "Error parsing xpath path obj from JSON");
      }
      nodeType = AndroidElementClassMap.match(nodeType);
      if (searchType.equals("child")) {
        s = s.childSelector(s);
        selOut += ".childSelector(s)";
      } else {
        s = s.className(nodeType);
        selOut += ".className('" + nodeType + "')";
      }
    }
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
}
