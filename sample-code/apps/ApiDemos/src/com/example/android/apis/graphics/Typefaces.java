/*
 * Copyright (C) 2008 The Android Open Source Project
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

package com.example.android.apis.graphics;

import android.content.Context;
import android.graphics.*;
import android.os.Bundle;
import android.view.View;

public class Typefaces extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private Paint    mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private Typeface mFace;

        public SampleView(Context context) {
            super(context);

            mFace = Typeface.createFromAsset(getContext().getAssets(),
                                             "fonts/samplefont.ttf");

            mPaint.setTextSize(64);
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            mPaint.setTypeface(null);
            canvas.drawText("Default", 10, 100, mPaint);
            mPaint.setTypeface(mFace);
            canvas.drawText("Custom", 10, 200, mPaint);
        }
    }
}

