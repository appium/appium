/*
 * Copyright (C) 2008 The Android Open Source Project
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

import android.test.ActivityInstrumentationTestCase2;
import android.test.suitebuilder.annotation.MediumTest;
import android.view.KeyEvent;
import android.widget.Button;

/**
 * An example of an {@link ActivityInstrumentationTestCase} of a specific activity {@link Focus2}.
 * By virtue of extending {@link ActivityInstrumentationTestCase}, the target activity is automatically
 * launched and finished before and after each test.  This also extends
 * {@link android.test.InstrumentationTestCase}, which provides
 * access to methods for sending events to the target activity, such as key and
 * touch events.  See {@link #sendKeys}.
 *
 * In general, {@link android.test.InstrumentationTestCase}s and {@link ActivityInstrumentationTestCase}s
 * are heavier weight functional tests available for end to end testing of your
 * user interface.  When run via a {@link android.test.InstrumentationTestRunner},
 * the necessary {@link android.app.Instrumentation} will be injected for you to
 * user via {@link #getInstrumentation} in your tests.
 *
 * See {@link com.example.android.apis.app.ForwardingTest} for an example of an Activity unit test.
 *
 * See {@link com.example.android.apis.AllTests} for documentation on running
 * all tests and individual tests in this application.
 */
public class Focus2ActivityTest extends ActivityInstrumentationTestCase2<Focus2> {

    private Button mLeftButton;
    private Button mCenterButton;
    private Button mRightButton;

    /**
     * Creates an {@link ActivityInstrumentationTestCase2} that tests the {@link Focus2} activity.
     */
    public Focus2ActivityTest() {
        super(Focus2.class);
    }

    @Override
    protected void setUp() throws Exception {
        super.setUp();
        final Focus2 a = getActivity();
        // ensure a valid handle to the activity has been returned
        assertNotNull(a);
        mLeftButton = (Button) a.findViewById(R.id.leftButton);
        mCenterButton = (Button) a.findViewById(R.id.centerButton);
        mRightButton = (Button) a.findViewById(R.id.rightButton);
    }

    /**
     * The name 'test preconditions' is a convention to signal that if this
     * test doesn't pass, the test case was not set up properly and it might
     * explain any and all failures in other tests.  This is not guaranteed
     * to run before other tests, as junit uses reflection to find the tests.
     */
    @MediumTest
    public void testPreconditions() {
        assertTrue("center button should be right of left button",
                mLeftButton.getRight() < mCenterButton.getLeft());
        assertTrue("right button should be right of center button",
                mCenterButton.getRight() < mRightButton.getLeft());
        assertTrue("left button should be focused", mLeftButton.isFocused());
    }

    @MediumTest
    public void testGoingRightFromLeftButtonJumpsOverCenterToRight() {
        sendKeys(KeyEvent.KEYCODE_DPAD_RIGHT);
        assertTrue("right button should be focused", mRightButton.isFocused());
    }

    @MediumTest
    public void testGoingLeftFromRightButtonGoesToCenter()  {
        // Give right button focus by having it request focus.  We post it
        // to the UI thread because we are not running on the same thread, and
        // any direct api calls that change state must be made from the UI thread.
        // This is in contrast to instrumentation calls that send events that are
        // processed through the framework and eventually find their way to
        // affecting the ui thread.
        getActivity().runOnUiThread(new Runnable() {
            public void run() {
                mRightButton.requestFocus();
            }
        });
        // wait for the request to go through
        getInstrumentation().waitForIdleSync();

        assertTrue(mRightButton.isFocused());

        sendKeys(KeyEvent.KEYCODE_DPAD_LEFT);
        assertTrue("center button should be focused", mCenterButton.isFocused());
    }
}
