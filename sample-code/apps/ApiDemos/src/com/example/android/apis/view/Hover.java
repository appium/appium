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

import com.example.android.apis.R;

import android.app.Activity;
import android.content.Context;
import android.content.res.Resources;
import android.os.Bundle;
import android.util.AttributeSet;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;


/**
 * Demonstrates how to use {@link View#onHoverEvent}, {@link ViewGroup#onInterceptHoverEvent},
 * and {@link View#setOnHoverListener}.
 *
 * This activity displays a few buttons and text fields and entices the user
 * to hover over them using a mouse or touch pad.  It displays feedback reporting
 * the position of the pointing device and the label of the view being hovered.
 *
 * A button changes from dark green to bright yellow when hovered.
 * This effect is achieved by using a state-list drawable to select among different
 * background shapes and colors based on the hover state of the button.
 *
 * A {@link View#OnHoverEventListener} is used to listen for hover events within the
 * container.  The container will re
 *
 * A checkbox is used to control whether a special view, the Interceptor, will intercept
 * events before they are sent to its child (a button).  When the Interceptor
 * is intercepting events, the button will not change state as the pointer hovers
 * over it because the interceptor itself will grab the events.
 */
public class Hover extends Activity {
    private TextView mMessageTextView;
    private CheckBox mInterceptCheckBox;
    private HoverInterceptorView mInterceptor;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.hover);

        mMessageTextView = (TextView) findViewById(R.id.message);
        mInterceptCheckBox = (CheckBox) findViewById(R.id.intercept_checkbox);
        mInterceptor = (HoverInterceptorView) findViewById(R.id.interceptor);

        View container = findViewById(R.id.container);
        container.setOnHoverListener(new View.OnHoverListener() {
            @Override
            public boolean onHover(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_HOVER_ENTER:
                        mMessageTextView.setText(Hover.this.getResources().getString(
                                R.string.hover_message_entered_at,
                                event.getX(), event.getY()));
                        break;
                    case MotionEvent.ACTION_HOVER_MOVE:
                        mMessageTextView.setText(Hover.this.getResources().getString(
                                R.string.hover_message_moved_at,
                                event.getX(), event.getY()));
                        break;
                    case MotionEvent.ACTION_HOVER_EXIT:
                        mMessageTextView.setText(Hover.this.getResources().getString(
                                R.string.hover_message_exited_at,
                                event.getX(), event.getY()));
                        break;
                }
                return false;
            }
        });

        mInterceptCheckBox.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                mInterceptor.setInterceptHover(isChecked);
            }
        });
    }
}
