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

package com.example.android.apis.app;

import com.example.android.apis.R;
import com.example.android.apis.view.Focus2ActivityTest;

import android.content.Context;
import android.content.Intent;
import android.test.ActivityUnitTestCase;
import android.test.suitebuilder.annotation.MediumTest;
import android.widget.Button;

/**
 * This demonstrates completely isolated "unit test" of an Activity class.
 *
 * <p>This model for testing creates the entire Activity (like {@link Focus2ActivityTest}) but does
 * not attach it to the system (for example, it cannot launch another Activity).  It allows you to
 * inject additional behaviors via the 
 * {@link android.test.ActivityUnitTestCase#setActivityContext(Context)} and 
 * {@link android.test.ActivityUnitTestCase#setApplication(android.app.Application)} methods.  
 * It also allows you to more carefully test your Activity's performance 
 * Writing unit tests in this manner requires more care and attention, but allows you to test
 * very specific behaviors, and can also be an easier way to test error conditions.
 * 
 * <p>Because ActivityUnitTestCase creates the Activity under test completely outside of
 * the usual system, tests of layout and point-click UI interaction are much less useful
 * in this configuration.  It's more useful here to concentrate on tests that involve the 
 * underlying data model, internal business logic, or exercising your Activity's life cycle.
 *
 * <p>See {@link com.example.android.apis.AllTests} for documentation on running
 * all tests and individual tests in this application.
 */
public class ForwardingTest extends ActivityUnitTestCase<Forwarding> {

    private Intent mStartIntent;
    private Button mButton;

    public ForwardingTest() {
        super(Forwarding.class);
      }

    @Override
    protected void setUp() throws Exception {
        super.setUp();

        // In setUp, you can create any shared test data, or set up mock components to inject
        // into your Activity.  But do not call startActivity() until the actual test methods.
        mStartIntent = new Intent(Intent.ACTION_MAIN);
    }

    /**
     * The name 'test preconditions' is a convention to signal that if this
     * test doesn't pass, the test case was not set up properly and it might
     * explain any and all failures in other tests.  This is not guaranteed
     * to run before other tests, as junit uses reflection to find the tests.
     */
    @MediumTest
    public void testPreconditions() {
        startActivity(mStartIntent, null, null);
        mButton = (Button) getActivity().findViewById(R.id.go);
        
        assertNotNull(getActivity());
        assertNotNull(mButton);
    }
    
    /**
     * This test demonstrates examining the way that activity calls startActivity() to launch 
     * other activities.
     */
    @MediumTest
    public void testSubLaunch() {
        Forwarding activity = startActivity(mStartIntent, null, null);
        mButton = (Button) activity.findViewById(R.id.go);
        
        // This test confirms that when you click the button, the activity attempts to open
        // another activity (by calling startActivity) and close itself (by calling finish()).
        mButton.performClick();
        
        assertNotNull(getStartedActivityIntent());
        assertTrue(isFinishCalled());
    }
    
    /**
     * This test demonstrates ways to exercise the Activity's life cycle.
     */
    @MediumTest
    public void testLifeCycleCreate() {
        Forwarding activity = startActivity(mStartIntent, null, null);
        
        // At this point, onCreate() has been called, but nothing else
        // Complete the startup of the activity
        getInstrumentation().callActivityOnStart(activity);
        getInstrumentation().callActivityOnResume(activity);
        
        // At this point you could test for various configuration aspects, or you could 
        // use a Mock Context to confirm that your activity has made certain calls to the system
        // and set itself up properly.
        
        getInstrumentation().callActivityOnPause(activity);
        
        // At this point you could confirm that the activity has paused properly, as if it is
        // no longer the topmost activity on screen.
        
        getInstrumentation().callActivityOnStop(activity);
        
        // At this point, you could confirm that the activity has shut itself down appropriately,
        // or you could use a Mock Context to confirm that your activity has released any system
        // resources it should no longer be holding.

        // ActivityUnitTestCase.tearDown(), which is always automatically called, will take care
        // of calling onDestroy().
    }

}
