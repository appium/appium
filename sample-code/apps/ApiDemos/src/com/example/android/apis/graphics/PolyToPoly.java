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

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
//import com.example.android.apis.R;

import android.content.Context;
import android.graphics.*;
import android.os.Bundle;
import android.view.View;

public class PolyToPoly extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private Paint   mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private Matrix  mMatrix = new Matrix();
        private Paint.FontMetrics mFontMetrics;

        private void doDraw(Canvas canvas, float src[], float dst[]) {
            canvas.save();
            mMatrix.setPolyToPoly(src, 0, dst, 0, src.length >> 1);
            canvas.concat(mMatrix);

            mPaint.setColor(Color.GRAY);
            mPaint.setStyle(Paint.Style.STROKE);
            canvas.drawRect(0, 0, 64, 64, mPaint);
            canvas.drawLine(0, 0, 64, 64, mPaint);
            canvas.drawLine(0, 64, 64, 0, mPaint);

            mPaint.setColor(Color.RED);
            mPaint.setStyle(Paint.Style.FILL);
            // how to draw the text center on our square
            // centering in X is easy... use alignment (and X at midpoint)
            float x = 64/2;
            // centering in Y, we need to measure ascent/descent first
            float y = 64/2 - (mFontMetrics.ascent + mFontMetrics.descent)/2;
            canvas.drawText(src.length/2 + "", x, y, mPaint);

            canvas.restore();
        }

        public SampleView(Context context) {
            super(context);

            // for when the style is STROKE
            mPaint.setStrokeWidth(4);
            // for when we draw text
            mPaint.setTextSize(40);
            mPaint.setTextAlign(Paint.Align.CENTER);
            mFontMetrics = mPaint.getFontMetrics();
        }

        @Override
        protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            canvas.save();
            canvas.translate(10, 10);
            // translate (1 point)
            doDraw(canvas, new float[] { 0, 0 }, new float[] { 5, 5 });
            canvas.restore();

            canvas.save();
            canvas.translate(160, 10);
            // rotate/uniform-scale (2 points)
            doDraw(canvas, new float[] { 32, 32, 64, 32 },
                           new float[] { 32, 32, 64, 48 });
            canvas.restore();

            canvas.save();
            canvas.translate(10, 110);
            // rotate/skew (3 points)
            doDraw(canvas, new float[] { 0, 0, 64, 0, 0, 64 },
                           new float[] { 0, 0, 96, 0, 24, 64 });
            canvas.restore();

            canvas.save();
            canvas.translate(160, 110);
            // perspective (4 points)
            doDraw(canvas, new float[] { 0, 0, 64, 0, 64, 64, 0, 64 },
                           new float[] { 0, 0, 96, 0, 64, 96, 0, 64 });
            canvas.restore();
        }
    }
}
