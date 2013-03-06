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

import android.content.SharedPreferences;
import android.content.SharedPreferences.OnSharedPreferenceChangeListener;
import android.os.Bundle;
import android.os.Handler;
import android.preference.PreferenceActivity;
import android.preference.CheckBoxPreference;
import android.widget.Toast;

/**
 * Example that shows finding a preference from the hierarchy and a custom preference type.
 */
public class AdvancedPreferences extends PreferenceActivity implements OnSharedPreferenceChangeListener {
    public static final String KEY_MY_PREFERENCE = "my_preference";
    public static final String KEY_ADVANCED_CHECKBOX_PREFERENCE = "advanced_checkbox_preference";

    private CheckBoxPreference mCheckBoxPreference;
    private Handler mHandler = new Handler();

    /**
     * This is a simple example of controlling a preference from code.
     */
    private Runnable mForceCheckBoxRunnable = new Runnable() {
        public void run() {
            if (mCheckBoxPreference != null) {
                mCheckBoxPreference.setChecked(!mCheckBoxPreference.isChecked());
            }

            // Force toggle again in a second
            mHandler.postDelayed(this, 1000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Load the XML preferences file
        addPreferencesFromResource(R.xml.advanced_preferences);

        // Get a reference to the checkbox preference
        mCheckBoxPreference = (CheckBoxPreference)getPreferenceScreen().findPreference(
                KEY_ADVANCED_CHECKBOX_PREFERENCE);
    }

    @Override
    protected void onResume() {
        super.onResume();

        // Start the force toggle
        mForceCheckBoxRunnable.run();

        // Set up a listener whenever a key changes
        getPreferenceScreen().getSharedPreferences().registerOnSharedPreferenceChangeListener(this);
    }

    @Override
    protected void onPause() {
        super.onPause();

        // Unregister the listener whenever a key changes
        getPreferenceScreen().getSharedPreferences().unregisterOnSharedPreferenceChangeListener(this);

        mHandler.removeCallbacks(mForceCheckBoxRunnable);
    }

    public void onSharedPreferenceChanged(SharedPreferences sharedPreferences, String key) {
        // Let's do something when my counter preference value changes
        if (key.equals(KEY_MY_PREFERENCE)) {
            Toast.makeText(this, "Thanks! You increased my count to "
                    + sharedPreferences.getInt(key, 0), Toast.LENGTH_SHORT).show();
        }
    }

}
