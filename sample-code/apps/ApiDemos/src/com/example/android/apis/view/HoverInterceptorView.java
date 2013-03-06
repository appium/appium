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

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Part of the {@link Hover} demo activity.
 * 
 * The Interceptor view is a simple subclass of LinearLayout whose sole purpose
 * is to override {@link #onInterceptHoverEvent}.  When the checkbox in the
 * hover activity is checked, the interceptor view will intercept hover events.
 *
 * When this view intercepts hover events, its children will not receive
 * hover events.  This can be useful in some cases when implementing a custom
 * view group that would like to prevent its children from being hovered
 * under certain situations.  Usually such custom views will be much more
 * interesting and complex than our little Interceptor example here.
 */
public class HoverInterceptorView extends LinearLayout {
    private boolean mInterceptHover;

    public HoverInterceptorView(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public boolean onInterceptHoverEvent(MotionEvent event) {
        if (mInterceptHover) {
            return true;
        }
        return super.onInterceptHoverEvent(event);
    }

    @Override
    public boolean onHoverEvent(MotionEvent event) {
        TextView textView = (TextView) findViewById(R.id.intercept_message);
        if (mInterceptHover && event.getAction() != MotionEvent.ACTION_HOVER_EXIT) {
            textView.setText(getResources().getString(
                    R.string.hover_intercept_message_intercepted));
            return true;
        }
        textView.setText(getResources().getString(
                R.string.hover_intercept_message_initial));
        return super.onHoverEvent(event);
    }

    public void setInterceptHover(boolean intercept) {
        mInterceptHover = intercept;
    }
}
