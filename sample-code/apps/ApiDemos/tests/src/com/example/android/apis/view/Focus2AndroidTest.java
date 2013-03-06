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

import android.content.Context;
import android.test.AndroidTestCase;
import android.test.suitebuilder.annotation.SmallTest;
import android.view.FocusFinder;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;

/**
 * This exercises the same logic as {@link Focus2ActivityTest} but in a lighter
 * weight manner; it doesn't need to launch the activity, and it can test the
 * focus behavior by calling {@link FocusFinder} methods directly.
 *
 * {@link Focus2ActivityTest} is still useful to verify that, at an end to end
 * level, key events actually translate to focus transitioning in the way we expect.
 * A good complementary way to use both types of tests might be to have more exhaustive
 * coverage in the lighter weight test case, and a few end to end scenarios in the
 * functional {@link android.test.ActivityInstrumentationTestCase}.  This would provide reasonable
 * assurance that the end to end system is working, while avoiding the overhead of
 * having every corner case exercised in the slower, heavier weight way.
 *
 * Even as a lighter weight test, this test still needs access to a {@link Context}
 * to inflate the file, which is why it extends {@link AndroidTestCase}.
 * 
 * If you ever need a context to do your work in tests, you can extend
 * {@link AndroidTestCase}, and when run via an {@link android.test.InstrumentationTestRunner},
 * the context will be injected for you.
 * 
 * See {@link com.example.android.apis.app.ForwardingTest} for an example of an Activity unit test.
 *
 * See {@link com.example.android.apis.AllTests} for documentation on running
 * all tests and individual tests in this application.
 */
public class Focus2AndroidTest extends AndroidTestCase {

    private FocusFinder mFocusFinder;

    private ViewGroup mRoot;

    private Button mLeftButton;
    private Button mCenterButton;
    private Button mRightButton;

    @Override
    protected void setUp() throws Exception {
        super.setUp();

        mFocusFinder = FocusFinder.getInstance();

        // inflate the layout
        final Context context = getContext();
        final LayoutInflater inflater = LayoutInflater.from(context);
        mRoot = (ViewGroup) inflater.inflate(R.layout.focus_2, null);

        // manually measure it, and lay it out
        mRoot.measure(500, 500);
        mRoot.layout(0, 0, 500, 500);

        mLeftButton = (Button) mRoot.findViewById(R.id.leftButton);
        mCenterButton = (Button) mRoot.findViewById(R.id.centerButton);
        mRightButton = (Button) mRoot.findViewById(R.id.rightButton);
    }

    /**
     * The name 'test preconditions' is a convention to signal that if this
     * test doesn't pass, the test case was not set up properly and it might
     * explain any and all failures in other tests.  This is not guaranteed
     * to run before other tests, as junit uses reflection to find the tests.
     */
    @SmallTest
    public void testPreconditions() {
        assertNotNull(mLeftButton);
        assertTrue("center button should be right of left button",
                mLeftButton.getRight() < mCenterButton.getLeft());
        assertTrue("right button should be right of center button",
                mCenterButton.getRight() < mRightButton.getLeft());
    }

    @SmallTest
    public void testGoingRightFromLeftButtonJumpsOverCenterToRight() {
        assertEquals("right should be next focus from left",
                mRightButton,
                mFocusFinder.findNextFocus(mRoot, mLeftButton, View.FOCUS_RIGHT));
    }

    @SmallTest
    public void testGoingLeftFromRightButtonGoesToCenter() {
        assertEquals("center should be next focus from right",
                mCenterButton,
                mFocusFinder.findNextFocus(mRoot, mRightButton, View.FOCUS_LEFT));
    }
}
