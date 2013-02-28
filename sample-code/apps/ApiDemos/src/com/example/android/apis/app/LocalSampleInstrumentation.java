/*
 * Copyright (C) 2007 The Android Open Source Project
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

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.view.KeyEvent;
import android.os.Bundle;
import android.util.Log;

/**
 * This is an example implementation of the {@link android.app.Instrumentation}
 * class demonstrating instrumentation against one of this application's sample
 * activities.
 */
public class LocalSampleInstrumentation extends Instrumentation {
    public abstract static class ActivityRunnable implements Runnable {
        public final Activity activity;
        public ActivityRunnable(Activity _activity) {
            activity = _activity;
        }
    }

    @Override
    public void onCreate(Bundle arguments) {
        super.onCreate(arguments);

        // When this instrumentation is created, we simply want to start
        // its test code off in a separate thread, which will call back
        // to us in onStart().
        start();
    }

    @Override
    public void onStart() {
        super.onStart();
        // First start the activity we are instrumenting -- the save/restore
        // state sample, which has a nice edit text into which we can write
        // text.
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setClass(getTargetContext(), SaveRestoreState.class);
        SaveRestoreState activity = (SaveRestoreState)startActivitySync(intent);

        // This is the Activity object that was started, to do with as we want.
        Log.i("LocalSampleInstrumentation",
              "Initial text: " + activity.getSavedText());

        // Clear the text so we start fresh.
        runOnMainSync(new ActivityRunnable(activity) {
            public void run() {
                ((SaveRestoreState)activity).setSavedText("");
            }
        });

        // Act like the user is typing some text.
        sendKeySync(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_SHIFT_LEFT));
        sendCharacterSync(KeyEvent.KEYCODE_H);
        sendKeySync(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_SHIFT_LEFT));
        sendCharacterSync(KeyEvent.KEYCODE_E);
        sendCharacterSync(KeyEvent.KEYCODE_L);
        sendCharacterSync(KeyEvent.KEYCODE_L);
        sendCharacterSync(KeyEvent.KEYCODE_O);

        // Wait for the activity to finish all of its processing.
        waitForIdleSync();

        // Retrieve the text we should have written...
        Log.i("LocalSampleInstrumentation",
              "Final text: " + activity.getSavedText());

        // And we are done!
        Log.i("ContactsFilterInstrumentation", "Done!");
        finish(Activity.RESULT_OK, null);
    }
}

