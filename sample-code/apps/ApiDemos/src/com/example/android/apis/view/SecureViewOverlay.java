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

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;

/**
 * This view is part of the {@link SecureView} demonstration activity.
 *
 * This view is constructed in such a way as to obscure the buttons and descriptive
 * text of the activity in a poor attempt to fool the user into clicking on the buttons
 * despite the activity telling the user that they may be harmful.
 */
public class SecureViewOverlay extends ViewGroup {
    private SecureView mActivity;

    public SecureViewOverlay(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public void setActivityToSpoof(SecureView activity) {
        this.mActivity = activity;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        measureChildren(widthMeasureSpec, heightMeasureSpec);

        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }

    @Override
    protected void onLayout(boolean changed, int l, int t, int r, int b) {
        spoofLayout(findViewById(R.id.secure_view_overlay_description),
                mActivity.findViewById(R.id.secure_view_description));
        spoofLayout(findViewById(R.id.secure_view_overlay_button1),
                mActivity.findViewById(R.id.secure_view_unsecure_button));
        spoofLayout(findViewById(R.id.secure_view_overlay_button2),
                mActivity.findViewById(R.id.secure_view_builtin_secure_button));
        spoofLayout(findViewById(R.id.secure_view_overlay_button3),
                mActivity.findViewById(R.id.secure_view_custom_secure_button));
    }

    private void spoofLayout(View spoof, View original) {
        final int[] globalPos = new int[2];
        getLocationOnScreen(globalPos);
        int x = globalPos[0];
        int y = globalPos[1];

        original.getLocationOnScreen(globalPos);
        x = globalPos[0] - x;
        y = globalPos[1] - y;
        spoof.layout(x, y, x + original.getWidth(), y + original.getHeight());
    }
}
