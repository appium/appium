/*
 * Copyright (C) 2011 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.example.android.apis.view;

import com.example.android.apis.R;

import android.app.Activity;
import android.content.Context;
import android.content.res.Resources;
import android.hardware.input.InputManager;
import android.os.Bundle;
import android.util.Log;
import android.util.SparseArray;
import android.util.SparseIntArray;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.InputDevice.MotionRange;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.List;


/**
 * Demonstrates how to process input events received from game controllers.
 * It also shows how to detect when input devices are added, removed or reconfigured.
 *
 * This activity displays button states and joystick positions.
 * Also writes detailed information about relevant input events to the log.
 *
 * The game controller is also uses to control a very simple game.  See {@link GameView}
 * for the game itself.
 */
public class GameControllerInput extends Activity
        implements InputManager.InputDeviceListener {
    private static final String TAG = "GameControllerInput";

    private InputManager mInputManager;
    private SparseArray<InputDeviceState> mInputDeviceStates;
    private GameView mGame;
    private ListView mSummaryList;
    private SummaryAdapter mSummaryAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        mInputManager = (InputManager)getSystemService(Context.INPUT_SERVICE);

        mInputDeviceStates = new SparseArray<InputDeviceState>();
        mSummaryAdapter = new SummaryAdapter(this, getResources());

        setContentView(R.layout.game_controller_input);

        mGame = (GameView) findViewById(R.id.game);

        mSummaryList = (ListView) findViewById(R.id.summary);
        mSummaryList.setAdapter(mSummaryAdapter);
        mSummaryList.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                mSummaryAdapter.onItemClick(position);
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();

        // Register an input device listener to watch when input devices are
        // added, removed or reconfigured.
        mInputManager.registerInputDeviceListener(this, null);

        // Query all input devices.
        // We do this so that we can see them in the log as they are enumerated.
        int[] ids = mInputManager.getInputDeviceIds();
        for (int i = 0; i < ids.length; i++) {
            getInputDeviceState(ids[i]);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();

        // Remove the input device listener when the activity is paused.
        mInputManager.unregisterInputDeviceListener(this);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        mGame.requestFocus();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        // Update device state for visualization and logging.
        InputDeviceState state = getInputDeviceState(event.getDeviceId());
        if (state != null) {
            switch (event.getAction()) {
                case KeyEvent.ACTION_DOWN:
                    if (state.onKeyDown(event)) {
                        mSummaryAdapter.show(state);
                    }
                    break;
                case KeyEvent.ACTION_UP:
                    if (state.onKeyUp(event)) {
                        mSummaryAdapter.show(state);
                    }
                    break;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        // Check that the event came from a joystick since a generic motion event
        // could be almost anything.
        if (isJoystick(event.getSource())
                && event.getAction() == MotionEvent.ACTION_MOVE) {
            // Update device state for visualization and logging.
            InputDeviceState state = getInputDeviceState(event.getDeviceId());
            if (state != null && state.onJoystickMotion(event)) {
                mSummaryAdapter.show(state);
            }
        }
        return super.dispatchGenericMotionEvent(event);
    }

    private InputDeviceState getInputDeviceState(int deviceId) {
        InputDeviceState state = mInputDeviceStates.get(deviceId);
        if (state == null) {
            final InputDevice device = mInputManager.getInputDevice(deviceId);
            if (device == null) {
                return null;
            }
            state = new InputDeviceState(device);
            mInputDeviceStates.put(deviceId, state);
            Log.i(TAG, "Device enumerated: " + state.mDevice);
        }
        return state;
    }

    // Implementation of InputManager.InputDeviceListener.onInputDeviceAdded()
    @Override
    public void onInputDeviceAdded(int deviceId) {
        InputDeviceState state = getInputDeviceState(deviceId);
        Log.i(TAG, "Device added: " + state.mDevice);
    }

    // Implementation of InputManager.InputDeviceListener.onInputDeviceChanged()
    @Override
    public void onInputDeviceChanged(int deviceId) {
        InputDeviceState state = mInputDeviceStates.get(deviceId);
        if (state != null) {
            mInputDeviceStates.remove(deviceId);
            state = getInputDeviceState(deviceId);
            Log.i(TAG, "Device changed: " + state.mDevice);
        }
    }

    // Implementation of InputManager.InputDeviceListener.onInputDeviceRemoved()
    @Override
    public void onInputDeviceRemoved(int deviceId) {
        InputDeviceState state = mInputDeviceStates.get(deviceId);
        if (state != null) {
            Log.i(TAG, "Device removed: " + state.mDevice);
            mInputDeviceStates.remove(deviceId);
        }
    }

    private static boolean isJoystick(int source) {
        return (source & InputDevice.SOURCE_CLASS_JOYSTICK) != 0;
    }

    /**
     * Tracks the state of joystick axes and game controller buttons for a particular
     * input device for diagnostic purposes.
     */
    private static class InputDeviceState {
        private final InputDevice mDevice;
        private final int[] mAxes;
        private final float[] mAxisValues;
        private final SparseIntArray mKeys;

        public InputDeviceState(InputDevice device) {
            mDevice = device;

            int numAxes = 0;
            final List<MotionRange> ranges = device.getMotionRanges();
            for (MotionRange range : ranges) {
                if ((range.getSource() & InputDevice.SOURCE_CLASS_JOYSTICK) != 0) {
                    numAxes += 1;
                }
            }

            mAxes = new int[numAxes];
            mAxisValues = new float[numAxes];
            int i = 0;
            for (MotionRange range : ranges) {
                if ((range.getSource() & InputDevice.SOURCE_CLASS_JOYSTICK) != 0) {
                    mAxes[i++] = range.getAxis();
                }
            }

            mKeys = new SparseIntArray();
        }

        public InputDevice getDevice() {
            return mDevice;
        }

        public int getAxisCount() {
            return mAxes.length;
        }

        public int getAxis(int axisIndex) {
            return mAxes[axisIndex];
        }

        public float getAxisValue(int axisIndex) {
            return mAxisValues[axisIndex];
        }

        public int getKeyCount() {
            return mKeys.size();
        }

        public int getKeyCode(int keyIndex) {
            return mKeys.keyAt(keyIndex);
        }

        public boolean isKeyPressed(int keyIndex) {
            return mKeys.valueAt(keyIndex) != 0;
        }

        public boolean onKeyDown(KeyEvent event) {
            final int keyCode = event.getKeyCode();
            if (isGameKey(keyCode)) {
                if (event.getRepeatCount() == 0) {
                    final String symbolicName = KeyEvent.keyCodeToString(keyCode);
                    mKeys.put(keyCode, 1);
                    Log.i(TAG, mDevice.getName() + " - Key Down: " + symbolicName);
                }
                return true;
            }
            return false;
        }

        public boolean onKeyUp(KeyEvent event) {
            final int keyCode = event.getKeyCode();
            if (isGameKey(keyCode)) {
                int index = mKeys.indexOfKey(keyCode);
                if (index >= 0) {
                    final String symbolicName = KeyEvent.keyCodeToString(keyCode);
                    mKeys.put(keyCode, 0);
                    Log.i(TAG, mDevice.getName() + " - Key Up: " + symbolicName);
                }
                return true;
            }
            return false;
        }

        public boolean onJoystickMotion(MotionEvent event) {
            StringBuilder message = new StringBuilder();
            message.append(mDevice.getName()).append(" - Joystick Motion:\n");

            final int historySize = event.getHistorySize();
            for (int i = 0; i < mAxes.length; i++) {
                final int axis = mAxes[i];
                final float value = event.getAxisValue(axis);
                mAxisValues[i] = value;
                message.append("  ").append(MotionEvent.axisToString(axis)).append(": ");

                // Append all historical values in the batch.
                for (int historyPos = 0; historyPos < historySize; historyPos++) {
                    message.append(event.getHistoricalAxisValue(axis, historyPos));
                    message.append(", ");
                }

                // Append the current value.
                message.append(value);
                message.append("\n");
            }
            Log.i(TAG, message.toString());
            return true;
        }

        // Check whether this is a key we care about.
        // In a real game, we would probably let the user configure which keys to use
        // instead of hardcoding the keys like this.
        private static boolean isGameKey(int keyCode) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_UP:
                case KeyEvent.KEYCODE_DPAD_DOWN:
                case KeyEvent.KEYCODE_DPAD_LEFT:
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                case KeyEvent.KEYCODE_DPAD_CENTER:
                case KeyEvent.KEYCODE_SPACE:
                    return true;
                default:
                    return KeyEvent.isGamepadButton(keyCode);
            }
        }
    }

    /**
     * A list adapter that displays a summary of the device state.
     */
    private static class SummaryAdapter extends BaseAdapter {
        private static final int BASE_ID_HEADING = 1 << 10;
        private static final int BASE_ID_DEVICE_ITEM = 2 << 10;
        private static final int BASE_ID_AXIS_ITEM = 3 << 10;
        private static final int BASE_ID_KEY_ITEM = 4 << 10;

        private final Context mContext;
        private final Resources mResources;

        private final SparseArray<Item> mDataItems = new SparseArray<Item>();
        private final ArrayList<Item> mVisibleItems = new ArrayList<Item>();

        private final Heading mDeviceHeading;
        private final TextColumn mDeviceNameTextColumn;

        private final Heading mAxesHeading;
        private final Heading mKeysHeading;

        private InputDeviceState mState;

        public SummaryAdapter(Context context, Resources resources) {
            mContext = context;
            mResources = resources;

            mDeviceHeading = new Heading(BASE_ID_HEADING | 0,
                    mResources.getString(R.string.game_controller_input_heading_device));
            mDeviceNameTextColumn = new TextColumn(BASE_ID_DEVICE_ITEM | 0,
                    mResources.getString(R.string.game_controller_input_label_device_name));

            mAxesHeading = new Heading(BASE_ID_HEADING | 1,
                    mResources.getString(R.string.game_controller_input_heading_axes));
            mKeysHeading = new Heading(BASE_ID_HEADING | 2,
                    mResources.getString(R.string.game_controller_input_heading_keys));
        }

        public void onItemClick(int position) {
            if (mState != null) {
                Toast toast = Toast.makeText(
                        mContext, mState.getDevice().toString(), Toast.LENGTH_LONG);
                toast.show();
            }
        }

        public void show(InputDeviceState state) {
            mState = state;
            mVisibleItems.clear();

            // Populate device information.
            mVisibleItems.add(mDeviceHeading);
            mDeviceNameTextColumn.setContent(state.getDevice().getName());
            mVisibleItems.add(mDeviceNameTextColumn);

            // Populate axes.
            mVisibleItems.add(mAxesHeading);
            final int axisCount = state.getAxisCount();
            for (int i = 0; i < axisCount; i++) {
                final int axis = state.getAxis(i);
                final int id = BASE_ID_AXIS_ITEM | axis;
                TextColumn column = (TextColumn) mDataItems.get(id);
                if (column == null) {
                    column = new TextColumn(id, MotionEvent.axisToString(axis));
                    mDataItems.put(id, column);
                }
                column.setContent(Float.toString(state.getAxisValue(i)));
                mVisibleItems.add(column);
            }

            // Populate keys.
            mVisibleItems.add(mKeysHeading);
            final int keyCount = state.getKeyCount();
            for (int i = 0; i < keyCount; i++) {
                final int keyCode = state.getKeyCode(i);
                final int id = BASE_ID_KEY_ITEM | keyCode;
                TextColumn column = (TextColumn) mDataItems.get(id);
                if (column == null) {
                    column = new TextColumn(id, KeyEvent.keyCodeToString(keyCode));
                    mDataItems.put(id, column);
                }
                column.setContent(mResources.getString(state.isKeyPressed(i)
                        ? R.string.game_controller_input_key_pressed
                        : R.string.game_controller_input_key_released));
                mVisibleItems.add(column);
            }

            notifyDataSetChanged();
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }

        @Override
        public int getCount() {
            return mVisibleItems.size();
        }

        @Override
        public Item getItem(int position) {
            return mVisibleItems.get(position);
        }

        @Override
        public long getItemId(int position) {
            return getItem(position).getItemId();
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            return getItem(position).getView(convertView, parent);
        }

        private static abstract class Item {
            private final int mItemId;
            private final int mLayoutResourceId;
            private View mView;

            public Item(int itemId, int layoutResourceId) {
                mItemId = itemId;
                mLayoutResourceId = layoutResourceId;
            }

            public long getItemId() {
                return mItemId;
            }

            public View getView(View convertView, ViewGroup parent) {
                if (mView == null) {
                    LayoutInflater inflater = (LayoutInflater)
                            parent.getContext().getSystemService(Context.LAYOUT_INFLATER_SERVICE);
                    mView = inflater.inflate(mLayoutResourceId, parent, false);
                    initView(mView);
                }
                updateView(mView);
                return mView;
            }

            protected void initView(View view) {
            }

            protected void updateView(View view) {
            }
        }

        private static class Heading extends Item {
            private final String mLabel;

            public Heading(int itemId, String label) {
                super(itemId, R.layout.game_controller_input_heading);
                mLabel = label;
            }

            @Override
            public void initView(View view) {
                TextView textView = (TextView) view;
                textView.setText(mLabel);
            }
        }

        private static class TextColumn extends Item {
            private final String mLabel;

            private String mContent;
            private TextView mContentView;

            public TextColumn(int itemId, String label) {
                super(itemId, R.layout.game_controller_input_text_column);
                mLabel = label;
            }

            public void setContent(String content) {
                mContent = content;
            }

            @Override
            public void initView(View view) {
                TextView textView = (TextView) view.findViewById(R.id.label);
                textView.setText(mLabel);

                mContentView = (TextView) view.findViewById(R.id.content);
            }

            @Override
            public void updateView(View view) {
                mContentView.setText(mContent);
            }
        }
    }
}
