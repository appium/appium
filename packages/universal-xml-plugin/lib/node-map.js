/*
 * This file exports a mapping between universal node names and platform-specific node names. The
 * keys in the exported object are the universal node names, and the values are objects with keys
 * corresponding to platformNames. The values of those platformName keys can be either a string
 * (meaning that that platform-specific node name will be mapped to the universal node name), or an
 * array of strings. This means that there can be a many-to-one relationship between
 * platform-specific node names and universal node names.
 */
export default {
  Alert: {
    ios: 'XCUIElementTypeAlert',
    android: 'android.widget.Toast',
  },
  App: {
    ios: 'XCUIElementTypeApplication',
  },
  Button: {
    ios: [
      'XCUIElementTypeButton',
      'XCUIElementTypeDecrementArrow',
      'XCUIElementTypeIncrementArrow',
      'XCUIElementTypeDisclosureTriangle',
      'XCUIElementTypeHandle',
      'XCUIElementTypeKey',
      'XCUIElementTypeLink',
      'XCUIElementTypeMenuButton',
      'XCUIElementTypePageIndicator',
      'XCUIElementTypePopUpButton',
      'XCUIElementTypeToolbarButton',
      'XCUIElementTypeRadioButton',
      'XCUIElementTypeTab',
    ],
    android: [
      'android.widget.Button',
      'android.widget.ImageButton',
      'android.widget.RadioButton',
      'android.widget.QuickContactBadge',
    ],
  },
  Cell: {
    ios: 'XCUIElementTypeCell',
  },
  CheckBox: {
    ios: 'XCUIElementTypeCheckBox',
    android: 'android.widget.CheckBox',
  },
  Column: {
    ios: 'XCUIElementTypeTableColumn',
  },
  DateInput: {
    ios: 'XCUIElementTypeDatePicker',
    android: 'android.widget.DatePicker',
  },
  Element: {
    ios: [
      'XCUIElementTypeOther',
      'XCUIElementTypeAny',
      'XCUIElementTypeMatte',
      'XCUIElementTypeMenuBarItem',
      'XCUIElementTypeMenuItem',
      'XCUIElementTypeRuler',
      'XCUIElementTypeRulerMarker',
      'XCUIElementTypeSplitter',
      'XCUIElementTypeStatusItem',
      'XCUIElementTypeTimeline',
    ],
    android: ['android.widget.Space', 'android.widget.TwoLineListItem'],
  },
  Grid: {
    ios: 'XCUIElementTypeGrid',
    android: ['android.widget.GridLayout', 'android.widget.GridView'],
  },
  Icon: {
    ios: ['XCUIElementTypeIcon', 'XCUIElementTypeDockItem'],
  },
  Image: {
    ios: 'XCUIElementTypeImage',
    android: 'android.widget.ImageView',
  },
  Indicator: {
    ios: [
      'XCUIElementTypeLevelIndicator',
      'XCUIElementTypeProgressIndicator',
      'XCUIElementTypeRatingIndicator',
      'XCUIElementTypeRelevanceIndicator',
      'XCUIElementTypeValueIndicator',
    ],
    android: ['android.widget.RatingBar', 'android.widget.ProgressBar'],
  },
  Input: {
    ios: ['XCUIElementTypeColorWell'],
    android: [],
  },
  List: {
    android: [
      'android.widget.ListView',
      'android.widget.ExpandableListView',
      'android.widget.Gallery',
    ],
    ios: ['XCUIElementTypeCollectionView'],
  },
  Map: {
    ios: 'XCUIElementTypeMap',
  },
  Menu: {
    ios: ['XCUIElementTypeMenu', 'XCUIElementTypeMenuBar'],
    android: ['android.widget.ActionMenuView', 'android.widget.PopupMenu'],
  },
  Modal: {
    android: [
      'android.widget.ListPopupWindow',
      'android.widget.PopupWindow',
      'android.widget.SlidingDrawer',
      'android.widget.Magnifier',
    ],
    ios: [
      'XCUIElementTypeDrawer',
      'XCUIElementTypeDialog',
      'XCUIElementTypePopover',
    ],
  },
  Nav: {
    ios: 'XCUIElementTypeNavigationBar',
  },
  PickerInput: {
    ios: 'XCUIElementTypePickerWheel',
    android: [
      'android.widget.NumberPicker',
      'android.widget.TimePicker',
      'android.widget.CalendarView',
    ],
  },
  RadioInput: {
    ios: 'XCUIElementTypeRadioGroup',
    android: 'android.widget.RadioGroup',
  },
  Row: {
    ios: [
      'XCUIElementTypeTableRow',
      'XCUIElementTypeOutlineRow',
      'XCUIElementTypeSegmentedControl',
      'XCUIElementTypeTouchBar',
    ],
    android: 'android.widget.TableRow',
  },
  Scrollable: {
    ios: 'XCUIElementTypeScrollView',
    android: [
      'android.widget.ScrollView',
      'android.widget.HorizontalScrollView',
    ],
  },
  SearchInput: {
    android: 'android.widget.SearchView',
    ios: 'XCUIElementTypeSearchField',
  },
  SliderInput: {
    android: 'android.widget.SeekBar',
    ios: [
      'XCUIElementTypeSlider',
      'XCUIElementTypeStepper',
      'XCUIElementTypeScrollBar',
    ],
  },
  Spinner: {
    ios: 'XCUIElementTypeActivityIndicator',
    android: 'android.widget.Spinner',
  },
  SwitchInput: {
    ios: 'XCUIElementTypeSwitch',
    android: 'android.widget.Switch',
  },
  Table: {
    ios: 'XCUIElementTypeTable',
    android: 'android.widget.TableLayout',
  },
  Text: {
    ios: [
      'XCUIElementTypeStaticText',
      'XCUIElementTypeTextView',
      'XCUIElementTypeHelpTag',
    ],
    android: [
      'android.widget.TextView',
      'android.widget.Chronometer',
      'android.widget.TextClock',
    ],
  },
  TextInput: {
    ios: [
      'XCUIElementTypeTextField',
      'XCUIElementTypeSecureTextField',
      'XCUIElementTypeComboBox',
    ],
    android: [
      'android.widget.EditText',
      'android.widget.AutoCompleteTextView',
      'android.widget.MultiAutoCompleteTextView',
    ],
  },
  ToggleInput: {
    ios: 'XCUIElementTypeToggle',
    android: ['android.widget.CheckedTextView', 'android.widget.ToggleButton'],
  },
  Toolbar: {
    ios: 'XCUIElementTypeToolbar',
    android: 'android.widget.Toolbar',
  },
  UI: {
    ios: 'AppiumAUT',
    android: 'hierarchy',
  },
  Video: {
    android: 'android.widget.VideoView',
  },
  View: {
    android: [
      'android.widget.FrameLayout',
      'android.widget.LinearLayout',
      'android.widget.RelativeLayout',
      'android.view.View',
      'android.view.ViewGroup',
      'android.widget.MediaController',
      'android.widget.StackView',
    ],
    ios: [
      'XCUIElementTypeBrowser',
      'XCUIElementTypeGroup',
      'XCUIElementTypeKeyboard',
      'XCUIElementTypeLayoutArea',
      'XCUIElementTypeLayoutItem',
      'XCUIElementTypeOutline',
      'XCUIElementTypePicker',
      'XCUIElementTypeSheet',
      'XCUIElementTypeSplitGroup',
      'XCUIElementTypeStatusBar',
      'XCUIElementTypeTabBar',
      'XCUIElementTypeTabGroup',
    ],
  },
  WebView: {
    ios: 'XCUIElementTypeWebView',
  },
  Window: {
    ios: 'XCUIElementTypeWindow',
  },
};
