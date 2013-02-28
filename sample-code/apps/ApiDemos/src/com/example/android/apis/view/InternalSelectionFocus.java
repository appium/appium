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

import android.app.Activity;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.LinearLayout;

/**
 * {@link android.view.View#requestFocus(int, android.graphics.Rect)}
 * and
 * {@link android.view.View#onFocusChanged(boolean, int, android.graphics.Rect)}
 * work together to give a newly focused item a hint about the most interesting
 * rectangle of the previously focused view.  The view taking focus can use this
 * to set an internal selection more appropriate using this rect.
 *
 * This Activity excercises that behavior using three adjacent {@link InternalSelectionView}
 * that report interesting rects when giving up focus, and use interesting rects
 * when taking focus to best select the internal row to show as selected.
 *
 * Were {@link InternalSelectionView} not to override {@link android.view.View#getFocusedRect}, or
 * {@link android.view.View#onFocusChanged(boolean, int, android.graphics.Rect)}, the focus would
 * jump to some default internal selection (the top) and not allow for the smooth handoff.
 */
public class InternalSelectionFocus extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        layout.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0,
                ViewGroup.LayoutParams.MATCH_PARENT, 1);

        final InternalSelectionView leftColumn = new InternalSelectionView(this, 5, "left column");
        leftColumn.setLayoutParams(params);
        leftColumn.setPadding(10, 10, 10, 10);
        layout.addView(leftColumn);

        final InternalSelectionView middleColumn = new InternalSelectionView(this, 5, "middle column");
        middleColumn.setLayoutParams(params);
        middleColumn.setPadding(10, 10, 10, 10);
        layout.addView(middleColumn);

        final InternalSelectionView rightColumn = new InternalSelectionView(this, 5, "right column");
        rightColumn.setLayoutParams(params);
        rightColumn.setPadding(10, 10, 10, 10);
        layout.addView(rightColumn);

        setContentView(layout);
    }


}
