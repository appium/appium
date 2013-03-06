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

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;

/**
 * Controller to start and stop a service. The serivce will update a status bar
 * notification every 5 seconds for a minute.
 */
public class NotifyingController extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.notifying_controller);

        Button button = (Button) findViewById(R.id.notifyStart);
        button.setOnClickListener(mStartListener);
        button = (Button) findViewById(R.id.notifyStop);
        button.setOnClickListener(mStopListener);
    }

    private OnClickListener mStartListener = new OnClickListener() {
        public void onClick(View v) {
            startService(new Intent(NotifyingController.this, 
                    NotifyingService.class));
        }
    };

    private OnClickListener mStopListener = new OnClickListener() {
        public void onClick(View v) {
            stopService(new Intent(NotifyingController.this, 
                    NotifyingService.class));
        }
    };
}

