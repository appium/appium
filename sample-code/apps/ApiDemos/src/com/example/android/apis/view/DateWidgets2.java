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
import android.widget.TextView;
import android.widget.TimePicker;
import android.os.Bundle;

public class DateWidgets2 extends Activity {

    // where we display the selected date and time
    private TextView mTimeDisplay;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.date_widgets_example_2);

        TimePicker timePicker = (TimePicker) findViewById(R.id.timePicker);
        timePicker.setCurrentHour(12);
        timePicker.setCurrentMinute(15);

        mTimeDisplay = (TextView) findViewById(R.id.dateDisplay);

        updateDisplay(12, 15);

        timePicker.setOnTimeChangedListener(new TimePicker.OnTimeChangedListener() {

            public void onTimeChanged(TimePicker view, int hourOfDay, int minute) {
                updateDisplay(hourOfDay, minute);
            }
        });
    }

    private void updateDisplay(int hourOfDay, int minute) {
        mTimeDisplay.setText(
                    new StringBuilder()
                    .append(pad(hourOfDay)).append(":")
                    .append(pad(minute)));
    }

    private static String pad(int c) {
        if (c >= 10)
            return String.valueOf(c);
        else
            return "0" + String.valueOf(c);
    }

}
