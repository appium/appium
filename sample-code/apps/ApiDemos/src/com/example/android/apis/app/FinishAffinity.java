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
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.TextView;

public class FinishAffinity extends Activity {
    int mNesting;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_finish_affinity);

        mNesting = getIntent().getIntExtra("nesting", 1);
        ((TextView)findViewById(R.id.seq)).setText("Current nesting: " + mNesting);

        // Watch for button clicks.
        Button button = (Button)findViewById(R.id.nest);
        button.setOnClickListener(mNestListener);
        button = (Button)findViewById(R.id.finish);
        button.setOnClickListener(mFinishListener);
    }

    private OnClickListener mNestListener = new OnClickListener() {
        public void onClick(View v) {
            Intent intent = new Intent(FinishAffinity.this, FinishAffinity.class);
            intent.putExtra("nesting", mNesting+1);
            startActivity(intent);
        }
    };

    private OnClickListener mFinishListener = new OnClickListener() {
        public void onClick(View v) {
            finishAffinity();
        }
    };
}
