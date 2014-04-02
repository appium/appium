package io.appium.android.bootstrap.utils;

import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.exceptions.UiSelectorSyntaxException;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.ArrayList;

/**
 * For parsing strings passed in for the "-android uiautomator" locator strategy
 */
public class UiSelectorParser {

  private String text;
  private UiSelector selector;
  private final static Method[] methods = UiSelector.class.getDeclaredMethods();

  public UiSelector parse(String textToParse) throws UiSelectorSyntaxException {
    selector = new UiSelector();
    text = cleanseText(textToParse);

    while (text.length() > 0) {
      consumePeriod();
      consumeFunctionCall();
    }

    return selector;
  }

  // prepares text for the main parsing loop
  private String cleanseText(String dirtyText) {
    String cleanText = dirtyText.trim();

    if (cleanText.startsWith("new UiSelector()")) {
      cleanText = cleanText.substring(16);
    }
    else if (cleanText.startsWith("UiSelector()")) {
      cleanText = cleanText.substring(12);
    }
    else if (!cleanText.startsWith(".")){
      cleanText = "." + cleanText;
    }

    return cleanText;
  }

  private void consumePeriod() throws UiSelectorSyntaxException {
    if (text.startsWith(".")) {
      text = text.substring(1);
    }
    else {
      throw new UiSelectorSyntaxException("Expected \".\" but saw \"" + text.charAt(0) + "\"");
    }
  }

  /*
   * consume [a-z]* then an open paren, this is our methodName
   * consume .* and count open/close parens until the original open paren is close, this is our argument
   *
   */
  private void consumeFunctionCall() throws UiSelectorSyntaxException {
    String methodName;
    StringBuilder argument = new StringBuilder();

    int parenIndex = text.indexOf('(');
    methodName = text.substring(0, parenIndex);

    int index = parenIndex+1;
    int parenCount = 1;
    while (parenCount > 0) {
      try {
        switch (text.charAt(index)) {
          case ')':
            parenCount--;
            if (parenCount > 0) {
              argument.append(text.charAt(index));
            }
            break;
          case '(':
            parenCount++;
            argument.append(text.charAt(index));
            break;
          default:
            argument.append(text.charAt(index));
        }
      } catch (StringIndexOutOfBoundsException e) {
        throw new UiSelectorSyntaxException("unclosed paren in expression");
      }
      index++;
    }
    if (argument.length() < 1) {
      throw new UiSelectorSyntaxException(methodName + " method expects an argument");
    }

    //add two for parentheses surrounding arg
    text = text.substring(methodName.length() + argument.length() + 2);

    ArrayList<Method> overloadedMethods = getSelectorMethods(methodName);
    if (overloadedMethods.size() < 1) {
      throw new UiSelectorSyntaxException("UiSelector has no " + methodName + " method");
    }

    selector = applyArgToMethods(overloadedMethods, argument.toString());
  }

  private ArrayList<Method> getSelectorMethods(String methodName) {
    ArrayList<Method> ret = new ArrayList<Method>();
    for (Method method : methods) {
      if (method.getName().equals(methodName)) {
        ret.add(method);
      }
    }
    return ret;
  }

  private UiSelector applyArgToMethods(ArrayList<Method> methods, String argument) throws UiSelectorSyntaxException {

    Object arg = null;
    Method ourMethod = null;
    UiSelectorSyntaxException exThrown = null;
    for (Method method : methods) {
      try {
        Type parameterType = method.getGenericParameterTypes()[0];
        arg = coerceArgToType(parameterType, argument);
        ourMethod = method;
      } catch (UiSelectorSyntaxException e) {
        exThrown = e;
      }
    }

    if (ourMethod == null || arg == null) {
      if (exThrown != null) {
        throw exThrown;
      } else {
        throw new UiSelectorSyntaxException("Could not apply argument " + argument + " to UiSelector method");
      }
    }

    try {
      return (UiSelector)ourMethod.invoke(selector, arg);
    } catch (IllegalAccessException e) {
      e.printStackTrace();
      throw new UiSelectorSyntaxException("problem using reflection to call this method");
    } catch (InvocationTargetException e) {
      e.printStackTrace();
      throw new UiSelectorSyntaxException("problem using reflection to call this method");
    }

  }

  private Object coerceArgToType(Type type, String argument) throws UiSelectorSyntaxException {
    if (type == boolean.class) {
      if (argument.equals("true")) {
        return true;
      }
      if (argument.equals("false")) {
        return false;
      }
      throw new UiSelectorSyntaxException(argument + " is not a boolean");
    }

    if (type == String.class) {
      if (argument.charAt(0) != '"' || argument.charAt(argument.length()-1) != '"') {
        throw new UiSelectorSyntaxException(argument + " is not a string");
      }
      return argument.substring(1, argument.length()-1);
    }

    if (type == int.class) {
      return Integer.parseInt(argument);
    }

    if (type.toString().equals("java.lang.Class<T>")) {
      try {
        return Class.forName(argument);
      } catch (ClassNotFoundException e) {
        throw new UiSelectorSyntaxException(argument + " class could not be found");
      }
    }

    if (type == UiSelector.class) {
      UiSelectorParser parser = new UiSelectorParser();
      return parser.parse(argument);
    }

    throw new UiSelectorSyntaxException("Could not coerce " + argument + " to any sort of Type");
  }
}
