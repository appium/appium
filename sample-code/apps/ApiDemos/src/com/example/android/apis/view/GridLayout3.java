/*
 * Copyright (C) 2011 The Android Open Source Project
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

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;

import android.widget.*;

import static android.text.InputType.*;
import static android.widget.GridLayout.*;
import static android.widget.GridLayout.LayoutParams;

/**
 * A form, showing use of the GridLayout API. Here we demonstrate use of the row/column order
 * preserved property which allows rows and or columns to pass over each other when needed.
 * The two buttons in the bottom right corner need to be separated from the other UI elements.
 * This can either be done by separating rows or separating columns - but we don't need
 * to do both and may only have enough space to do one or the other.
 */
public class GridLayout3 extends Activity {
    public static View create(Context context) {
        GridLayout p = new GridLayout(context);
        p.setUseDefaultMargins(true);
        p.setAlignmentMode(ALIGN_BOUNDS);
        Configuration configuration = context.getResources().getConfiguration();
        if ((configuration.orientation == Configuration.ORIENTATION_PORTRAIT)) {
            p.setColumnOrderPreserved(false);
        } else {
            p.setRowOrderPreserved(false);
        }

        Spec titleRow              = spec(0);
        Spec introRow              = spec(1);
        Spec emailRow              = spec(2, BASELINE);
        Spec passwordRow           = spec(3, BASELINE);
        Spec button1Row            = spec(5);
        Spec button2Row            = spec(6);

        Spec centerInAllColumns    = spec(0, 4, CENTER);
        Spec leftAlignInAllColumns = spec(0, 4, LEFT);
        Spec labelColumn           = spec(0, RIGHT);
        Spec fieldColumn           = spec(1, LEFT);
        Spec defineLastColumn      = spec(3);
        Spec fillLastColumn        = spec(3, FILL);

        {
            TextView c = new TextView(context);
            c.setTextSize(32);
            c.setText("Email setup");
            p.addView(c, new LayoutParams(titleRow, centerInAllColumns));
        }
        {
            TextView c = new TextView(context);
            c.setTextSize(16);
            c.setText("You can configure email in a few simple steps:");
            p.addView(c, new LayoutParams(introRow, leftAlignInAllColumns));
        }
        {
            TextView c = new TextView(context);
            c.setText("Email address:");
            p.addView(c, new LayoutParams(emailRow, labelColumn));
        }
        {
            EditText c = new EditText(context);
            c.setEms(10);
            c.setInputType(TYPE_CLASS_TEXT | TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
            p.addView(c, new LayoutParams(emailRow, fieldColumn));
        }
        {
            TextView c = new TextView(context);
            c.setText("Password:");
            p.addView(c, new LayoutParams(passwordRow, labelColumn));
        }
        {
            TextView c = new EditText(context);
            c.setEms(8);
            c.setInputType(TYPE_CLASS_TEXT | TYPE_TEXT_VARIATION_PASSWORD);
            p.addView(c, new LayoutParams(passwordRow, fieldColumn));
        }
        {
            Button c = new Button(context);
            c.setText("Manual setup");
            p.addView(c, new LayoutParams(button1Row, defineLastColumn));
        }
        {
            Button c = new Button(context);
            c.setText("Next");
            p.addView(c, new LayoutParams(button2Row, fillLastColumn));
        }

        return p;
    }

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(create(this));
    }

}