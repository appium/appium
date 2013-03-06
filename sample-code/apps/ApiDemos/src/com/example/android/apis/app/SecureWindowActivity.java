/*
 * Copyright (C) 2012 The Android Open Source Project
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

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;

/**
 * <h3>Secure Window Activity</h3>
 *
 * <p>
 * This activity demonstrates how to create an activity whose window is backed by
 * a secure surface using {@link WindowManager.LayoutParams#FLAG_SECURE}.
 * Because the surface is secure, its contents cannot be captured in screenshots
 * and will not be visible on non-secure displays even when mirrored.
 * </p><p>
 * Here are a few things you can do to experiment with secure surfaces and
 * observe their behavior.
 * <ul>
 * <li>Try taking a screenshot.  Either the system will prevent you from taking
 * a screenshot altogether or the screenshot should not contain the contents
 * of the secure surface.
 * <li>Try mirroring the secure surface onto a non-secure display such as an
 * "Overlay Display" created using the "Simulate secondary displays" option in
 * the "Developer options" section of the Settings application.  The non-secure
 * secondary display should not show the contents of the secure surface.
 * <li>Try mirroring the secure surface onto a secure display such as an
 * HDMI display with HDCP enabled.  The contents of the secure surface should appear
 * on the display.
 * </ul>
 * </p>
 */
public class SecureWindowActivity extends Activity {
    /**
     * Initialization of the Activity after it is first created.  Must at least
     * call {@link android.app.Activity#setContentView setContentView()} to
     * describe what is to be displayed in the screen.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Be sure to call the super class.
        super.onCreate(savedInstanceState);

        // See assets/res/any/layout/secure_window_activity.xml for this
        // view layout definition, which is being set here as
        // the content of our screen.
        setContentView(R.layout.secure_window_activity);

        // Make the window secure.  This must be done at the time the activity
        // is created.  It cannot be changed later.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE);
    }
}
