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
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;

public class UnicodeChart extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private Paint mBigCharPaint;
        private Paint mLabelPaint;
        private final char[] mChars = new char[256];
        private final float[] mPos = new float[512];

        private int mBase;

        private static final int XMUL = 20;
        private static final int YMUL = 28;
        private static final int YBASE = 18;

        public SampleView(Context context) {
            super(context);
            setFocusable(true);
            setFocusableInTouchMode(true);

            mBigCharPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            mBigCharPaint.setTextSize(15);
            mBigCharPaint.setTextAlign(Paint.Align.CENTER);

            mLabelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            mLabelPaint.setTextSize(8);
            mLabelPaint.setTextAlign(Paint.Align.CENTER);

            // the position array is the same for all charts
            float[] pos = mPos;
            int index = 0;
            for (int col = 0; col < 16; col++) {
                final float x = col * XMUL + 10;
                for (int row = 0; row < 16; row++) {
                    pos[index++] = x;
                    pos[index++] = row * YMUL + YBASE;
                }
            }
        }

        private float computeX(int index) {
            return (index >> 4) * XMUL + 10;
        }

        private float computeY(int index) {
            return (index & 0xF) * YMUL + YMUL;
        }

        private void drawChart(Canvas canvas, int base) {
            char[] chars = mChars;
            for (int i = 0; i < 256; i++) {
                int unichar = base + i;
                chars[i] = (char)unichar;

                canvas.drawText(Integer.toHexString(unichar),
                                computeX(i), computeY(i), mLabelPaint);
            }
            canvas.drawPosText(chars, 0, 256, mPos, mBigCharPaint);
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            canvas.translate(0, 1);
            drawChart(canvas, mBase * 256);
        }

        @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    if (mBase > 0) {
                        mBase -= 1;
                        invalidate();
                    }
                    return true;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    mBase += 1;
                    invalidate();
                    return true;
                default:
                    break;
            }
            return super.onKeyDown(keyCode, event);
        }
    }
}
