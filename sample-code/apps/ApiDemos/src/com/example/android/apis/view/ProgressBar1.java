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
import android.widget.Button;
import android.widget.ProgressBar;
import android.os.Bundle;
import android.view.View;
import android.view.Window;


/**
 * Demonstrates how to use progress bars as widgets and in the title bar.  The progress bar
 * in the title will be shown until the progress is complete, at which point it fades away.
 */
public class ProgressBar1 extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Request the progress bar to be shown in the title
        requestWindowFeature(Window.FEATURE_PROGRESS);
        setContentView(R.layout.progressbar_1);
        setProgressBarVisibility(true);
        
        final ProgressBar progressHorizontal = (ProgressBar) findViewById(R.id.progress_horizontal);
        setProgress(progressHorizontal.getProgress() * 100);
        setSecondaryProgress(progressHorizontal.getSecondaryProgress() * 100);
        
        Button button = (Button) findViewById(R.id.increase);
        button.setOnClickListener(new Button.OnClickListener() {
            public void onClick(View v) {
                progressHorizontal.incrementProgressBy(1);
                // Title progress is in range 0..10000
                setProgress(100 * progressHorizontal.getProgress());
            }
        });

        button = (Button) findViewById(R.id.decrease);
        button.setOnClickListener(new Button.OnClickListener() {
            public void onClick(View v) {
                progressHorizontal.incrementProgressBy(-1);
                // Title progress is in range 0..10000
                setProgress(100 * progressHorizontal.getProgress());
            }
        });

        button = (Button) findViewById(R.id.increase_secondary);
        button.setOnClickListener(new Button.OnClickListener() {
            public void onClick(View v) {
                progressHorizontal.incrementSecondaryProgressBy(1);
                // Title progress is in range 0..10000
                setSecondaryProgress(100 * progressHorizontal.getSecondaryProgress());
            }
        });

        button = (Button) findViewById(R.id.decrease_secondary);
        button.setOnClickListener(new Button.OnClickListener() {
            public void onClick(View v) {
                progressHorizontal.incrementSecondaryProgressBy(-1);
                // Title progress is in range 0..10000
                setSecondaryProgress(100 * progressHorizontal.getSecondaryProgress());
            }
        });
        
    }
}
