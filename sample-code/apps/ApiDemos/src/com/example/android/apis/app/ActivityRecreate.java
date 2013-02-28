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

package com.example.android.apis.app;

import com.example.android.apis.R;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;

public class ActivityRecreate extends Activity {
    int mCurTheme;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (savedInstanceState != null) {
            mCurTheme = savedInstanceState.getInt("theme");

            // Switch to a new theme different from last theme.
            switch (mCurTheme) {
                case android.R.style.Theme_Holo_Light:
                    mCurTheme = android.R.style.Theme_Holo_Dialog;
                    break;
                case android.R.style.Theme_Holo_Dialog:
                    mCurTheme = android.R.style.Theme_Holo;
                    break;
                default:
                    mCurTheme = android.R.style.Theme_Holo_Light;
                    break;
            }
            setTheme(mCurTheme);
        }

        setContentView(R.layout.activity_recreate);

        // Watch for button clicks.
        Button button = (Button)findViewById(R.id.recreate);
        button.setOnClickListener(mRecreateListener);
    }

    @Override
    protected void onSaveInstanceState(Bundle savedInstanceState) {
        super.onSaveInstanceState(savedInstanceState);
        savedInstanceState.putInt("theme", mCurTheme);
    }

    private OnClickListener mRecreateListener = new OnClickListener() {
        public void onClick(View v) {
            recreate();
        }
    };
}
