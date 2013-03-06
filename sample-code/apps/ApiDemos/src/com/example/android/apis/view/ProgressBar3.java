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
import android.app.Dialog;
import android.app.ProgressDialog;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;

/**
 * Demonstrates the use of progress dialogs.  Uses {@link Activity#onCreateDialog}
 * and {@link Activity#showDialog} to ensure the dialogs will be properly saved
 * and restored.
 */
public class ProgressBar3 extends Activity {

    ProgressDialog mDialog1;
    ProgressDialog mDialog2;

    private static final int DIALOG1_KEY = 0;
    private static final int DIALOG2_KEY = 1;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.progressbar_3);

        Button button = (Button) findViewById(R.id.showIndeterminate);
        button.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                showDialog(DIALOG1_KEY);
            }
        });

        button = (Button) findViewById(R.id.showIndeterminateNoTitle);
        button.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                showDialog(DIALOG2_KEY);
            }
        });
    }

    @Override
    protected Dialog onCreateDialog(int id) {
        switch (id) {
            case DIALOG1_KEY: {
                ProgressDialog dialog = new ProgressDialog(this);
                dialog.setTitle("Indeterminate");
                dialog.setMessage("Please wait while loading...");
                dialog.setIndeterminate(true);
                dialog.setCancelable(true);
                return dialog;
            }
            case DIALOG2_KEY: {
                ProgressDialog dialog = new ProgressDialog(this);
                dialog.setMessage("Please wait while loading...");
                dialog.setIndeterminate(true);
                dialog.setCancelable(true);
                return dialog;
            }
        }
        return null;
    }
}
