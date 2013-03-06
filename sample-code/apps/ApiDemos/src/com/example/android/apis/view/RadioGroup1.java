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
import android.view.View;
import android.widget.TextView;
import android.widget.RadioGroup;
import android.widget.Button;
import android.widget.RadioButton;
import android.widget.LinearLayout;


public class RadioGroup1 extends Activity implements RadioGroup.OnCheckedChangeListener,
        View.OnClickListener {

    private TextView mChoice;
    private RadioGroup mRadioGroup;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.radio_group_1);
        mRadioGroup = (RadioGroup) findViewById(R.id.menu);

        // test adding a radio button programmatically
        RadioButton newRadioButton = new RadioButton(this);
        newRadioButton.setText(R.string.radio_group_snack);
        newRadioButton.setId(R.id.snack);
        LinearLayout.LayoutParams layoutParams = new RadioGroup.LayoutParams(
                RadioGroup.LayoutParams.WRAP_CONTENT,
                RadioGroup.LayoutParams.WRAP_CONTENT);
        mRadioGroup.addView(newRadioButton, 0, layoutParams);

        // test listening to checked change events
        String selection = getString(R.string.radio_group_selection);
        mRadioGroup.setOnCheckedChangeListener(this);
        mChoice = (TextView) findViewById(R.id.choice);
        mChoice.setText(selection + mRadioGroup.getCheckedRadioButtonId());

        // test clearing the selection
        Button clearButton = (Button) findViewById(R.id.clear);
        clearButton.setOnClickListener(this);
    }

    public void onCheckedChanged(RadioGroup group, int checkedId) {
        String selection = getString(R.string.radio_group_selection);
        String none = getString(R.string.radio_group_none);
        mChoice.setText(selection +
                (checkedId == View.NO_ID ? none : checkedId));
    }

    public void onClick(View v) {
        mRadioGroup.clearCheck();
    }
}
