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
import android.os.Bundle;
import android.view.*;

public class MeasureText extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static final int WIDTH = 50;
    private static final int HEIGHT = 50;
    private static final int STRIDE = 64;   // must be >= WIDTH

    private static int[] createColors() {
        int[] colors = new int[STRIDE * HEIGHT];
        for (int y = 0; y < HEIGHT; y++) {
            for (int x = 0; x < WIDTH; x++) {
                int r = x * 255 / (WIDTH - 1);
                int g = y * 255 / (HEIGHT - 1);
                int b = 255 - Math.min(r, g);
                int a = Math.max(r, g);
                colors[y * STRIDE + x] = (a << 24) | (r << 16) | (g << 8) | b;
            }
        }
        return colors;
    }

    private static class SampleView extends View {
        private Paint   mPaint;
        private float   mOriginX = 10;
        private float   mOriginY = 80;

        public SampleView(Context context) {
            super(context);
            setFocusable(true);

            mPaint = new Paint();
            mPaint.setAntiAlias(true);
            mPaint.setStrokeWidth(5);
            mPaint.setStrokeCap(Paint.Cap.ROUND);
            mPaint.setTextSize(64);
            mPaint.setTypeface(Typeface.create(Typeface.SERIF,
                                               Typeface.ITALIC));
        }

        private void showText(Canvas canvas, String text, Paint.Align align) {
         //   mPaint.setTextAlign(align);

            Rect    bounds = new Rect();
            float[] widths = new float[text.length()];

            int count = mPaint.getTextWidths(text, 0, text.length(), widths);
            float w = mPaint.measureText(text, 0, text.length());
            mPaint.getTextBounds(text, 0, text.length(), bounds);

            mPaint.setColor(0xFF88FF88);
            canvas.drawRect(bounds, mPaint);
            mPaint.setColor(Color.BLACK);
            canvas.drawText(text, 0, 0, mPaint);

            float[] pts = new float[2 + count*2];
            float x = 0;
            float y = 0;
            pts[0] = x;
            pts[1] = y;
            for (int i = 0; i < count; i++) {
                x += widths[i];
                pts[2 + i*2] = x;
                pts[2 + i*2 + 1] = y;
            }
            mPaint.setColor(Color.RED);
            mPaint.setStrokeWidth(0);
            canvas.drawLine(0, 0, w, 0, mPaint);
            mPaint.setStrokeWidth(5);
            canvas.drawPoints(pts, 0, (count + 1) << 1, mPaint);
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            canvas.translate(mOriginX, mOriginY);

            showText(canvas, "Measure", Paint.Align.LEFT);
            canvas.translate(0, 80);
            showText(canvas, "wiggy!", Paint.Align.CENTER);
            canvas.translate(0, 80);
            showText(canvas, "Text", Paint.Align.RIGHT);
        }
    }
}
