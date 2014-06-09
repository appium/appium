package io.appium.android.bootstrap.handler;

import com.android.uiautomator.core.UiDevice;
import com.android.uiautomator.core.UiObjectNotFoundException;
import io.appium.android.bootstrap.*;
import io.appium.android.bootstrap.exceptions.InvalidCoordinatesException;
import io.appium.android.bootstrap.utils.Point;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Hashtable;

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

  private static class DragArguments {

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
      } catch (final Exception e) {
        el = null;
      }

      try {
        if (params.get("destElId") != JSONObject.NULL) {
          destEl = command.getDestElement();
        }
      } catch (final Exception e) {
        destEl = null;
      }
      start = new Point(params.get("startX"), params.get("startY"));
      end = new Point(params.get("endX"), params.get("endY"));
      steps = (Integer) params.get("steps");
    }
  }

  private AndroidCommandResult drag(final DragArguments dragArgs) {
    Point absStartPos = new Point();
    Point absEndPos = new Point();
    final UiDevice device = UiDevice.getInstance();

    try {
      absStartPos = getDeviceAbsPos(dragArgs.start);
      absEndPos = getDeviceAbsPos(dragArgs.end);
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

  private AndroidCommandResult dragElement(final DragArguments dragArgs) {
    Point absEndPos = new Point();

    if (dragArgs.destEl == null) {
      try {
        absEndPos = getDeviceAbsPos(dragArgs.end);
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
          + " with steps: " + dragArgs.steps);
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
    // DragArguments is created on each execute which prevents leaking state
    // across executions.
    final DragArguments dragArgs = new DragArguments(command);

    if (command.isElementCommand()) {
      return dragElement(dragArgs);
    } else {
      return drag(dragArgs);
    }
  }
}
