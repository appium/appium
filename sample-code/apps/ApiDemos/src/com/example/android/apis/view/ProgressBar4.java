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

package com.example.android.apis.view;

import com.example.android.apis.R;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.view.View;
import android.widget.Button;


/**
 * Demonstrates how to use an indeterminate progress indicator in the window's title bar.
 */
public class ProgressBar4 extends Activity {
    private boolean mToggleIndeterminate = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request progress bar
        requestWindowFeature(Window.FEATURE_INDETERMINATE_PROGRESS);
        setContentView(R.layout.progressbar_4);
        setProgressBarIndeterminateVisibility(mToggleIndeterminate);
        
        Button button = (Button) findViewById(R.id.toggle);
        button.setOnClickListener(new Button.OnClickListener() {
            public void onClick(View v) {
                mToggleIndeterminate = !mToggleIndeterminate;
                setProgressBarIndeterminateVisibility(mToggleIndeterminate);
            }
        });
    }
}
