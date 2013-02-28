/*
 * Copyright (C) 2010 The Android Open Source Project
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
import android.view.DragEvent;
import android.view.View;
import android.widget.TextView;

public class DragAndDropDemo extends Activity {
    TextView mResultText;
    DraggableDot mHiddenDot;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.drag_layout);

        TextView text = (TextView) findViewById(R.id.drag_text);
        DraggableDot dot = (DraggableDot) findViewById(R.id.drag_dot_1);
        dot.setReportView(text);
        dot = (DraggableDot) findViewById(R.id.drag_dot_2);
        dot.setReportView(text);
        dot = (DraggableDot) findViewById(R.id.drag_dot_3);
        dot.setReportView(text);

        mHiddenDot = (DraggableDot) findViewById(R.id.drag_dot_hidden);
        mHiddenDot.setReportView(text);

        mResultText = (TextView) findViewById(R.id.drag_result_text);
        mResultText.setOnDragListener(new View.OnDragListener() {
            public boolean onDrag(View v, DragEvent event) {
                final int action = event.getAction();
                switch (action) {
                    case DragEvent.ACTION_DRAG_STARTED: {
                        // Bring up a fourth draggable dot on the fly. Note that it
                        // is properly notified about the ongoing drag, and lights up
                        // to indicate that it can handle the current content.
                        mHiddenDot.setVisibility(View.VISIBLE);
                    } break;

                    case DragEvent.ACTION_DRAG_ENDED: {
                        // Hide the surprise again
                        mHiddenDot.setVisibility(View.INVISIBLE);

                        // Report the drop/no-drop result to the user
                        final boolean dropped = event.getResult();
                        mResultText.setText(dropped ? "Dropped!" : "No drop");
                    } break;
                }
                return false;
            }
        });
    }
}