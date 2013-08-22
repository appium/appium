package io.appium.android.bootstrap.handler;

import io.appium.android.bootstrap.AndroidCommand;
import io.appium.android.bootstrap.AndroidCommandResult;
import io.appium.android.bootstrap.AndroidElement;
import io.appium.android.bootstrap.CommandHandler;
import io.appium.android.bootstrap.Logger;
import io.appium.android.bootstrap.exceptions.ElementNotInHashException;
import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.utils.Point;

import java.util.Hashtable;

import org.json.JSONException;
import org.json.JSONObject;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;

/**
 * This handler is used to drag in the Android UI.
 * 
 */
public class Drag extends CommandHandler {

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

  private class DragArguments {

    public AndroidElement el;
    public AndroidElement destEl;
    public final Point    start;
    public final Point    end;
    public final Integer  steps;

    public DragArguments(final AndroidCommand command) throws JSONException {

      final Hashtable<String, Object> params = command.params();

      try {
        if (params.get("elementId") != JSONObject.NULL) {
          el = command.getElement();
        }
      } catch (final ElementNotInHashException e) {
        el = null;
      }
      try {
        if (params.get("destElId") != JSONObject.NULL) {
          destEl = command.getDestElement();
        }
      } catch (final ElementNotInHashException e) {
        destEl = null;
      }
      start = new Point(params.get("startX"), params.get("startY"));
      end = new Point(params.get("endX"), params.get("endY"));
      steps = (Integer) params.get("steps");
    }
  }

  private AndroidCommandResult drag(final DragArguments dragArgs)
      throws JSONException {
    Point absStartPos = new Point();
    Point absEndPos = new Point();
    final UiDevice device = UiDevice.getInstance();

    try {
      absStartPos = GetDeviceAbsPos(dragArgs.start);
      absEndPos = GetDeviceAbsPos(dragArgs.end);
    } catch (final InvalidCoordinatesException e) {
      return getErrorResult(e.getMessage());
    }

    Logger.info("Dragging from " + absStartPos.toString() + " to "
        + absEndPos.toString() + " with steps: " + dragArgs.steps.toString());
    final boolean rv = device.drag(absStartPos.x.intValue(),
        absStartPos.y.intValue(), absEndPos.x.intValue(),
        absEndPos.y.intValue(), dragArgs.steps);
    if (!rv) {
      return getErrorResult("Drag did not complete successfully");
    }
    return getSuccessResult(rv);
  }

  private AndroidCommandResult dragElement(final DragArguments dragArgs)
      throws JSONException {
    Point absEndPos = new Point();

    if (dragArgs.destEl == null) {
      try {
        absEndPos = GetDeviceAbsPos(dragArgs.end);
      } catch (final InvalidCoordinatesException e) {
        return getErrorResult(e.getMessage());
      }

      Logger.info("Dragging the element with id " + dragArgs.el.getId()
          + " to " + absEndPos.toString() + " with steps: "
          + dragArgs.steps.toString());
      try {
        final boolean rv = dragArgs.el.dragTo(absEndPos.x.intValue(),
            absEndPos.y.intValue(), dragArgs.steps);
        if (!rv) {
          return getErrorResult("Drag did not complete successfully");
        } else {
          return getSuccessResult(rv);
        }
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult("Drag did not complete successfully"
            + e.getMessage());
      }
    } else {
      Logger.info("Dragging the element with id " + dragArgs.el.getId()
          + " to destination element with id " + dragArgs.destEl.getId()
          + " with steps: " + dragArgs.steps.intValue());
      try {
        final boolean rv = dragArgs.el.dragTo(dragArgs.destEl.getUiObject(),
            dragArgs.steps);
        if (!rv) {
          return getErrorResult("Drag did not complete successfully");
        } else {
          return getSuccessResult(rv);
        }
      } catch (final UiObjectNotFoundException e) {
        return getErrorResult("Drag did not complete successfully"
            + e.getMessage());
      }
    }

  }

  @Override
  public AndroidCommandResult execute(final AndroidCommand command)
      throws JSONException {
    final DragArguments dragArgs = new DragArguments(command);

    if (command.isElementCommand()) {
      return dragElement(dragArgs);
    } else {
      return drag(dragArgs);
    }
  }
}
