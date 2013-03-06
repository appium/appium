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

import com.example.android.apis.R;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.TextView;

/**
 * Sub-activity that is executed by the redirection example when input is needed
 * from the user.
 */
public class RedirectGetter extends Activity
{
    private String mTextPref;
    private TextView mText;

    @Override
    protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.redirect_getter);

        // Watch for button clicks.
        Button applyButton = (Button)findViewById(R.id.apply);
        applyButton.setOnClickListener(mApplyListener);

        // The text being set.
        mText = (TextView)findViewById(R.id.text);

        // Display the stored values, or if not stored initialize with an empty String
        loadPrefs();
    }

    private final void loadPrefs()
    {
        // Retrieve the current redirect values.
        // NOTE: because this preference is shared between multiple
        // activities, you must be careful about when you read or write
        // it in order to keep from stepping on yourself.
        SharedPreferences preferences = getSharedPreferences("RedirectData", 0);

        mTextPref = preferences.getString("text", null);
        if (mTextPref != null) {
            mText.setText(mTextPref);
        } else {
            mText.setText("");
        }
    }

    private OnClickListener mApplyListener = new OnClickListener()
    {
        public void onClick(View v)
        {
            SharedPreferences preferences = getSharedPreferences("RedirectData", 0);
            SharedPreferences.Editor editor = preferences.edit();
            editor.putString("text", mText.getText().toString());

            if (editor.commit()) {
                setResult(RESULT_OK);
            }

            finish();
        }
    };
}
