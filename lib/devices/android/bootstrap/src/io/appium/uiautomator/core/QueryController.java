package io.appium.uiautomator.core;

import android.view.accessibility.AccessibilityNodeInfo;

import static io.appium.android.bootstrap.utils.ReflectionUtils.invoke;
import static io.appium.android.bootstrap.utils.ReflectionUtils.method;

public class QueryController {

  private static final String CLASS_QUERY_CONTROLLER = "com.android.uiautomator.core.QueryController";
  private static final String METHOD_GET_ACCESSIBILITY_ROOT_NODE = "getAccessibilityRootNode";

  private final Object queryController;

  public QueryController(Object queryController) {
    this.queryController = queryController;
  }

  public AccessibilityNodeInfo getAccessibilityRootNode() {
    return (AccessibilityNodeInfo) invoke(method(CLASS_QUERY_CONTROLLER, METHOD_GET_ACCESSIBILITY_ROOT_NODE), queryController);
  }

}
