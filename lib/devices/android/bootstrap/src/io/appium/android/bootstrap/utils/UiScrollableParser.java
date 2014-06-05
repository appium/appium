package io.appium.android.bootstrap.utils;

import com.android.uiautomator.core.UiObject;
import com.android.uiautomator.core.UiScrollable;
import com.android.uiautomator.core.UiSelector;
import io.appium.android.bootstrap.exceptions.UiSelectorSyntaxException;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collection;

/**
 * For parsing strings that create UiScrollable objects into UiScrollable objects
 */
public class UiScrollableParser {

  private String text;
  private UiScrollable scrollable;
  private UiObject uiObject;
  private boolean returnedUiObject;
  private final static Method[] methods = UiScrollable.class.getDeclaredMethods();
  private static String[] prefixes = {"new UiScrollable", "UiScrollable"};

  /*
   * Returns whether or not the input string is trying to instantiate a UiScrollable, and use its methods
   */
  public static boolean isUiScrollable(String textToParse) {
    for (String prefix : prefixes) {
      if (textToParse.startsWith(prefix)) {
        return true;
      }
    }
    return false;
  }

  /*
   * Parse a string into a UiSelector, but use UiScrollable class and methods
   */
  public UiSelector parse(String textToParse) throws UiSelectorSyntaxException {
    text = textToParse.trim();
    returnedUiObject = false;

    consumePrefix();
    consumeConstructor();

    while (text.length() > 0) {
      consumePeriod();
      consumeFunctionCall();
    }

    if (!returnedUiObject) {
      throw new UiSelectorSyntaxException("Last method called on a UiScrollable object must return a UiObject object");
    }

    return uiObject.getSelector();
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
   * You can start a UiScrollable like: "new UiScrollable(UiSelector).somemethod()" or "Uiscrollable(UiSelector).somemethod()"
   */
  private void consumePrefix() throws UiSelectorSyntaxException {
    boolean removedPrefix = false;
    for (String prefix : prefixes) {
      if (text.startsWith(prefix)) {
        text = text.substring(prefix.length());
        removedPrefix = true;
        break;
      }
    }
    if (!removedPrefix) {
      throw new UiSelectorSyntaxException("Was trying to parse as UiScrollable, but didn't start with an acceptable prefix. Acceptable prefixes are: 'new UiScrollable' or 'UiScrollable'. Saw: " + text);
    }
  }

  /*
   * consume UiScrollable constructor argument: parens surrounding a uiSelector. eg - "(new UiSelector().scrollable(true))"
   * initialize the UiScrollable object for this parser
   */
  private void consumeConstructor() throws UiSelectorSyntaxException {
    if (text.charAt(0) != '(') {
      throw new UiSelectorSyntaxException("Was expecting \"" + ")" + "\" but instead saw \"" + text.charAt(0) + "\"" );
    }
    StringBuilder argument = new StringBuilder();

    int index = 1;
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
      throw new UiSelectorSyntaxException("UiScrollable constructor expects an argument");
    }

    UiSelector selector = new UiSelectorParser().parse(argument.toString());
    scrollable = new UiScrollable(selector);

    // add two for parentheses surrounding arg
    text = text.substring(argument.length() + 2);
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

    ArrayList<String> args = splitArgs(argument.toString());

    Method method = getUiScrollableMethod(methodName, args);

    applyArgsToMethod(method, args);

    // add two for parentheses surrounding arg
    text = text.substring(methodName.length() + argument.length() + 2);
  }

  private Method getUiScrollableMethod(String methodName, Collection<String> args) throws UiSelectorSyntaxException {
    for (Method method : methods) {
      if (method.getName().equals(methodName) && method.getGenericParameterTypes().length == args.size()) {
        return method;
      }
    }
    throw new UiSelectorSyntaxException("UiScrollable has no \"" + methodName + "\" method that takes " + args.size() + " arguments");
  }

  private void applyArgsToMethod(Method method, ArrayList<String> arguments) throws UiSelectorSyntaxException {
    if (method.getGenericReturnType() == UiScrollable.class && returnedUiObject) {
      throw new UiSelectorSyntaxException("Cannot call UiScrollable method \"" + method.getName() + "\" on a UiObject instance");
    }

    if (method.getGenericParameterTypes().length == 0) {
      try {
        scrollable = (UiScrollable)method.invoke(scrollable);
      } catch (IllegalAccessException e) {
        e.printStackTrace();
        throw new UiSelectorSyntaxException("problem using reflection to call this method");
      } catch (InvocationTargetException e) {
        e.printStackTrace();
        throw new UiSelectorSyntaxException("problem using reflection to call this method");
      } catch (ClassCastException e) {
        throw new UiSelectorSyntaxException("methods must return UiScrollable or UiObject instances");
      }
    }

    else {
      ArrayList<Object> convertedArgs = new ArrayList<Object>();
      Type[] parameterTypes = method.getGenericParameterTypes();
      for (int i = 0; i < parameterTypes.length; i++) {
        convertedArgs.add(coerceArgToType(parameterTypes[i], arguments.get(i)));
      }

      if (method.getGenericReturnType() == UiScrollable.class) {
        if (convertedArgs.size() > 1) {
          throw new UiSelectorSyntaxException("No UiScrollable method that returns type UiScrollable takes more than 1 argument");
        }
        try {
          scrollable = (UiScrollable)method.invoke(scrollable, convertedArgs.get(0));
        } catch (IllegalAccessException e) {
          e.printStackTrace();
          throw new UiSelectorSyntaxException("problem using reflection to call this method");
        } catch (InvocationTargetException e) {
          e.printStackTrace();
          throw new UiSelectorSyntaxException("problem using reflection to call this method");
        }
      }

      else if (method.getGenericReturnType() == UiObject.class) {
        returnedUiObject = true;

        if (convertedArgs.size() == 2) {
          try {
            uiObject = (UiObject)method.invoke(scrollable, convertedArgs.get(0), convertedArgs.get(1));
          } catch (IllegalAccessException e) {
            e.printStackTrace();
            throw new UiSelectorSyntaxException("problem using reflection to call this method");
          } catch (InvocationTargetException e) {
            e.printStackTrace();
            throw new UiSelectorSyntaxException("problem using reflection to call this method");
          }
        } else if (convertedArgs.size() == 3) {
          try {
            uiObject = (UiObject)method.invoke(scrollable, convertedArgs.get(0), convertedArgs.get(1), convertedArgs.get(2));
          } catch (IllegalAccessException e) {
            e.printStackTrace();
            throw new UiSelectorSyntaxException("problem using reflection to call this method");
          } catch (InvocationTargetException e) {
            e.printStackTrace();
            throw new UiSelectorSyntaxException("problem using reflection to call this method");
          }
        }
        else {
          throw new UiSelectorSyntaxException("UiScrollable methods which return a UiObject have 2-3 args");
        }
      }

      else {
        throw new UiSelectorSyntaxException("Must only call methods on UiScrollable which return UiScrollable or UiObject objects");
      }
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

  private ArrayList<String> splitArgs(String argumentString) throws UiSelectorSyntaxException {
    ArrayList<String> args = new ArrayList<String>();
    if (argumentString.isEmpty()) {
      return args;
    }
    if (argumentString.charAt(0) == ',' || argumentString.charAt(argumentString.length()-1) == ',') {
      throw new UiSelectorSyntaxException("Missing argument. Trying to parse: " + argumentString);
    }

    int prevIndex = 0;
    int index = 1;
    boolean inQuotes = false;
    while (index < argumentString.length()) {
      switch (argumentString.charAt(index)) {
        case ',':
          if (!inQuotes) {
            if (prevIndex == index) {
              throw new UiSelectorSyntaxException("Missing argument. Trying to parse: " + argumentString);
            }
            args.add(argumentString.substring(prevIndex, index).trim());
            prevIndex = index+1;
          }
        case '"':
          inQuotes = !inQuotes;
          break;
      }
      index++;
    }
    args.add(argumentString.substring(prevIndex, index).trim());

    return args;
  }
}
