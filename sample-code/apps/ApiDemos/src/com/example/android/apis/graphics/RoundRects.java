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

package com.example.android.apis.graphics;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.*;
import android.os.Bundle;
import android.view.*;

public class RoundRects extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private Path    mPath;
        private Paint   mPaint;
        private Rect    mRect;
        private GradientDrawable mDrawable;

        public SampleView(Context context) {
            super(context);
            setFocusable(true);

            mPath = new Path();
            mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            mRect = new Rect(0, 0, 120, 120);

            mDrawable = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                                             new int[] { 0xFFFF0000, 0xFF00FF00,
                                                 0xFF0000FF });
            mDrawable.setShape(GradientDrawable.RECTANGLE);
            mDrawable.setGradientRadius((float)(Math.sqrt(2) * 60));
        }

        static void setCornerRadii(GradientDrawable drawable, float r0,
                                   float r1, float r2, float r3) {
            drawable.setCornerRadii(new float[] { r0, r0, r1, r1,
                                                  r2, r2, r3, r3 });
        }

        @Override protected void onDraw(Canvas canvas) {

            mDrawable.setBounds(mRect);

            float r = 16;

            canvas.save();
            canvas.translate(10, 10);
            mDrawable.setGradientType(GradientDrawable.LINEAR_GRADIENT);
            setCornerRadii(mDrawable, r, r, 0, 0);
            mDrawable.draw(canvas);
            canvas.restore();

            canvas.save();
            canvas.translate(10 + mRect.width() + 10, 10);
            mDrawable.setGradientType(GradientDrawable.RADIAL_GRADIENT);
            setCornerRadii(mDrawable, 0, 0, r, r);
            mDrawable.draw(canvas);
            canvas.restore();

            canvas.translate(0, mRect.height() + 10);

            canvas.save();
            canvas.translate(10, 10);
            mDrawable.setGradientType(GradientDrawable.SWEEP_GRADIENT);
            setCornerRadii(mDrawable, 0, r, r, 0);
            mDrawable.draw(canvas);
            canvas.restore();

            canvas.save();
            canvas.translate(10 + mRect.width() + 10, 10);
            mDrawable.setGradientType(GradientDrawable.LINEAR_GRADIENT);
            setCornerRadii(mDrawable, r, 0, 0, r);
            mDrawable.draw(canvas);
            canvas.restore();

            canvas.translate(0, mRect.height() + 10);

            canvas.save();
            canvas.translate(10, 10);
            mDrawable.setGradientType(GradientDrawable.RADIAL_GRADIENT);
            setCornerRadii(mDrawable, r, 0, r, 0);
            mDrawable.draw(canvas);
            canvas.restore();

            canvas.save();
            canvas.translate(10 + mRect.width() + 10, 10);
            mDrawable.setGradientType(GradientDrawable.SWEEP_GRADIENT);
            setCornerRadii(mDrawable, 0, r, 0, r);
            mDrawable.draw(canvas);
            canvas.restore();
        }
    }
}
