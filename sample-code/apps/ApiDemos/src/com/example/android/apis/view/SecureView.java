/*
 * Copyright (C) 2010 The Android Open Source Project
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
import android.app.AlertDialog;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.View.OnTouchListener;
import android.widget.Button;
import android.widget.Toast;


/**
 * This activity demonstrates two different ways in which views can be made more secure to
 * touch spoofing attacks by leveraging framework features.
 *
 * The activity presents 3 buttons that obtensibly perform a risky security critical
 * function.  Under ordinary circumstances, the user would never click on these buttons
 * or would at least think long and hard about it.  However, a carefully crafted toast can
 * overlay the contents of the activity in such a way as to make the user believe the buttons
 * are innocuous.  Since the toast cannot receive input, the touches are passed down to the
 * activity potentially yielding an effect other than what the user intended.
 *
 * To simulate the spoofing risk, this activity pops up a specially crafted overlay as
 * a toast layed out so as to cover the buttons and part of the descriptive text.
 * For the purposes of this demonstration, pretend that the overlay was actually popped
 * up by a malicious application published by the International Cabal of Evil Penguins.
 *
 * The 3 buttons are set up as follows:
 *
 * 1. The "unsecured button" does not apply any touch filtering of any kind.
 *    When the toast appears, this button remains clickable as usual which creates an
 *    opportunity for spoofing to occur.
 *
 * 2. The "built-in secured button" leverages the android:filterTouchesWhenObscured view
 *    attribute to ask the framework to filter out touches when the window is obscured.
 *    When the toast appears, the button does not receive the touch and appears to be inoperable.
 *
 * 3. The "custom secured button" adds a touch listener to the button which intercepts the
 *    touch event and checks whether the window is obscured.  If so, it warns the user and
 *    drops the touch event.  This example is intended to demonstrate how a view can
 *    perform its own filtering and provide additional feedback by examining the {@MotionEvent}
 *    flags to determine whether the window is obscured.  Here we use a touch listener but
 *    a custom view subclass could perform the filtering by overriding
 *    {@link View#onFilterTouchEventForSecurity(MotionEvent)}.
 *
 * Refer to the comments on {@View} for more information about view security.
 */
public class SecureView extends Activity {
    private int mClickCount;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.secure_view);

        Button toastButton = (Button) findViewById(R.id.secure_view_toast_button);
        toastButton.setOnClickListener(new OnClickListener() {
            public void onClick(View v) {
                showOverlay();
            }
        });

        Button unsecureButton = (Button) findViewById(R.id.secure_view_unsecure_button);
        setClickedAction(unsecureButton);

        Button builtinSecureButton = (Button) findViewById(R.id.secure_view_builtin_secure_button);
        setClickedAction(builtinSecureButton);

        Button customSecureButton = (Button) findViewById(R.id.secure_view_custom_secure_button);
        setClickedAction(customSecureButton);
        setTouchFilter(customSecureButton);
    }

    private void showOverlay() {
        // Generate a toast view with a special layout that will position itself right
        // on top of this view's interesting widgets.  Sneaky huh?
        SecureViewOverlay overlay = (SecureViewOverlay)
                getLayoutInflater().inflate(R.layout.secure_view_overlay, null);
        overlay.setActivityToSpoof(this);

        Toast toast = new Toast(getApplicationContext());
        toast.setGravity(Gravity.FILL, 0, 0);
        toast.setView(overlay);
        toast.show();
    }

    private void setClickedAction(Button button) {
        button.setOnClickListener(new OnClickListener() {
            public void onClick(View v) {
                String[] messages = getResources().getStringArray(R.array.secure_view_clicked);
                String message = messages[mClickCount++ % messages.length];

                new AlertDialog.Builder(SecureView.this)
                    .setTitle(R.string.secure_view_action_dialog_title)
                    .setMessage(message)
                    .setNeutralButton(getResources().getString(
                            R.string.secure_view_action_dialog_dismiss), null)
                    .show();
            }
        });
    }

    private void setTouchFilter(Button button) {
        button.setOnTouchListener(new OnTouchListener() {
            public boolean onTouch(View v, MotionEvent event) {
                if ((event.getFlags() & MotionEvent.FLAG_WINDOW_IS_OBSCURED) != 0) {
                    if (event.getAction() == MotionEvent.ACTION_UP) {
                        new AlertDialog.Builder(SecureView.this)
                            .setTitle(R.string.secure_view_caught_dialog_title)
                            .setMessage(R.string.secure_view_caught_dialog_message)
                            .setNeutralButton(getResources().getString(
                                    R.string.secure_view_caught_dialog_dismiss), null)
                            .show();
                    }
                    // Return true to prevent the button from processing the touch.
                    return true;
                }
                return false;
            }
        });
    }
}
