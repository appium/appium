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

package com.example.android.apis.preference;

import com.example.android.apis.R;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.preference.PreferenceManager;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.LinearLayout.LayoutParams;

/**
 * Demonstrates launching a PreferenceActivity and grabbing a value it saved.
 */
public class LaunchingPreferences extends Activity implements OnClickListener {

    private static final int REQUEST_CODE_PREFERENCES = 1;

    private TextView mCounterText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        /*
         * These preferences have defaults, so before using them go apply those
         * defaults.  This will only execute once -- when the defaults are applied
         * a boolean preference is set so they will not be applied again.
         */
        PreferenceManager.setDefaultValues(this, R.xml.advanced_preferences, false);

        // Simple layout
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        setContentView(layout);

        // Create a simple button that will launch the preferences
        Button launchPreferences = new Button(this);
        launchPreferences.setText(getString(R.string.launch_preference_activity));
        launchPreferences.setOnClickListener(this);
        layout.addView(launchPreferences, new LayoutParams(LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT));

        mCounterText = new TextView(this);
        layout.addView(mCounterText, new LayoutParams(LayoutParams.MATCH_PARENT,
                LayoutParams.WRAP_CONTENT));

        updateCounterText();
    }

    public void onClick(View v) {

        // When the button is clicked, launch an activity through this intent
        Intent launchPreferencesIntent = new Intent().setClass(this, AdvancedPreferences.class);

        // Make it a subactivity so we know when it returns
        startActivityForResult(launchPreferencesIntent, REQUEST_CODE_PREFERENCES);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        // The preferences returned if the request code is what we had given
        // earlier in startSubActivity
        if (requestCode == REQUEST_CODE_PREFERENCES) {
            // Read a sample value they have set
            updateCounterText();
        }
    }

    private void updateCounterText() {
        // Since we're in the same package, we can use this context to get
        // the default shared preferences
        SharedPreferences sharedPref = PreferenceManager.getDefaultSharedPreferences(this);
        final int counter = sharedPref.getInt(AdvancedPreferences.KEY_MY_PREFERENCE, 0);
        mCounterText.setText(getString(R.string.counter_value_is) + " " + counter);
    }
}
