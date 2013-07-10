package io.appium.android.bootstrap;

import io.appium.android.bootstrap.exceptions.AndroidCommandException;
import io.appium.android.bootstrap.exceptions.UnallowedTagNameException;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * Helper class to match up tag names and UI element class names.
 * 
 */
public class AndroidElementClassMap {

  private final HashMap<String, String> map;
  private final ArrayList<String>       unallowed;
  private static AndroidElementClassMap instance;

  /**
   * Generator
   * 
   * @return
   */
  private static AndroidElementClassMap getInstance() {
    if (AndroidElementClassMap.instance == null) {
      AndroidElementClassMap.instance = new AndroidElementClassMap();
    }
    return AndroidElementClassMap.instance;
  }

  /**
   * Find a matching UI element class name based on the tag name.
   * 
   * @param selector_text
   * @return String
   * @throws AndroidCommandException
   */
  public static String match(String selector_text)
      throws AndroidCommandException, UnallowedTagNameException {
    final AndroidElementClassMap inst = AndroidElementClassMap.getInstance();
    if (inst.unallowed.contains(selector_text)) {
      throw new UnallowedTagNameException(selector_text);
    } else {
      final String mappedSel = inst.map.get(selector_text);
      if ("view".equals(selector_text)) {
        return "android.view.View";
      } else if (mappedSel != null) {
        return "android.widget." + mappedSel;
      } else if (selector_text.contains(".")) {
        return selector_text;
      } else {
        selector_text = selector_text.substring(0, 1).toUpperCase()
            + selector_text.substring(1);
        return "android.widget." + selector_text;
      }
    }
  }

  public AndroidElementClassMap() {
    map = new HashMap<String, String>();
    unallowed = new ArrayList<String>();
    map.put("abslist", "AbsListView");
    map.put("absseek", "AbsSeekBar");
    map.put("absspinner", "AbsSpinner");
    map.put("absolute", "AbsoluteLayout");
    map.put("adapterview", "AdapterView");
    map.put("adapterviewanimator", "AdapterViewAnimator");
    map.put("adapterviewflipper", "AdapterViewFlipper");
    map.put("analogclock", "AnalogClock");
    map.put("appwidgethost", "AppWidgetHostView");
    map.put("autocomplete", "AutoCompleteTextView");
    map.put("button", "Button");
    map.put("breadcrumbs", "FragmentBreadCrumbs");
    map.put("calendar", "CalendarView");
    map.put("checkbox", "CheckBox");
    map.put("checked", "CheckedTextView");
    map.put("chronometer", "Chronometer");
    map.put("compound", "CompoundButton");
    map.put("datepicker", "DatePicker");
    map.put("dialerfilter", "DialerFilter");
    map.put("digitalclock", "DigitalClock");
    map.put("drawer", "SlidingDrawer");
    map.put("expandable", "ExpandableListView");
    map.put("extract", "ExtractEditText");
    map.put("fragmenttabhost", "FragmentTabHost");
    map.put("frame", "FrameLayout");
    map.put("gallery", "Gallery");
    map.put("gesture", "GestureOverlayView");
    map.put("glsurface", "GLSurfaceView");
    map.put("grid", "GridView");
    map.put("gridlayout", "GridLayout");
    map.put("horizontal", "HorizontalScrollView");
    map.put("image", "ImageView");
    map.put("imagebutton", "ImageButton");
    map.put("imageswitcher", "ImageSwitcher");
    map.put("keyboard", "KeyboardView");
    map.put("linear", "LinearLayout");
    map.put("list", "ListView");
    map.put("media", "MediaController");
    map.put("mediaroutebutton", "MediaRouteButton");
    map.put("multiautocomplete", "MultiAutoCompleteTextView");
    map.put("numberpicker", "NumberPicker");
    map.put("pagetabstrip", "PageTabStrip");
    map.put("pagetitlestrip", "PageTitleStrip");
    map.put("progress", "ProgressBar");
    map.put("quickcontactbadge", "QuickContactBadge");
    map.put("radio", "RadioButton");
    map.put("radiogroup", "RadioGroup");
    map.put("rating", "RatingBar");
    map.put("relative", "RelativeLayout");
    map.put("row", "TableRow");
    map.put("rssurface", "RSSurfaceView");
    map.put("rstexture", "RSTextureView");
    map.put("scroll", "ScrollView");
    map.put("search", "SearchView");
    map.put("seek", "SeekBar");
    map.put("space", "Space");
    map.put("spinner", "Spinner");
    map.put("stack", "StackView");
    map.put("surface", "SurfaceView");
    map.put("switch", "Switch");
    map.put("tabhost", "TabHost");
    map.put("tabwidget", "TabWidget");
    map.put("table", "TableLayout");
    map.put("text", "TextView");
    map.put("textclock", "TextClock");
    map.put("textswitcher", "TextSwitcher");
    map.put("texture", "TextureView");
    map.put("textfield", "EditText");
    map.put("timepicker", "TimePicker");
    map.put("toggle", "ToggleButton");
    map.put("twolinelistitem", "TwoLineListItem");
    map.put("video", "VideoView");
    map.put("viewanimator", "ViewAnimator");
    map.put("viewflipper", "ViewFlipper");
    map.put("viewgroup", "ViewGroup");
    map.put("viewpager", "ViewPager");
    map.put("viewstub", "ViewStub");
    map.put("viewswitcher", "ViewSwitcher");
    map.put("web", "android.webkit.WebView");
    map.put("window", "FrameLayout");
    map.put("zoom", "ZoomButton");
    map.put("zoomcontrols", "ZoomControls");

    unallowed.add("secure");
  }
}
