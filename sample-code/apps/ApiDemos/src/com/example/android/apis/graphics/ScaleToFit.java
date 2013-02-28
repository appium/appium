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

public class ScaleToFit extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private final Paint   mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint   mHairPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Paint   mLabelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Matrix  mMatrix = new Matrix();
        private final RectF   mSrcR = new RectF();

        private static final Matrix.ScaleToFit[] sFits =
                new Matrix.ScaleToFit[] {
            Matrix.ScaleToFit.FILL,
            Matrix.ScaleToFit.START,
            Matrix.ScaleToFit.CENTER,
            Matrix.ScaleToFit.END
        };

        private static final String[] sFitLabels = new String[] {
            "FILL", "START", "CENTER", "END"
        };

        private static final int[] sSrcData = new int[] {
            80, 40, Color.RED,
            40, 80, Color.GREEN,
            30, 30, Color.BLUE,
            80, 80, Color.BLACK
        };
        private static final int N = 4;

        private static final int WIDTH = 52;
        private static final int HEIGHT = 52;
        private final RectF mDstR = new RectF(0, 0, WIDTH, HEIGHT);

        public SampleView(Context context) {
            super(context);

            mHairPaint.setStyle(Paint.Style.STROKE);
            mLabelPaint.setTextSize(16);
        }

        private void setSrcR(int index) {
            int w = sSrcData[index*3 + 0];
            int h = sSrcData[index*3 + 1];
            mSrcR.set(0, 0, w, h);
        }

        private void drawSrcR(Canvas canvas, int index) {
            mPaint.setColor(sSrcData[index*3 + 2]);
            canvas.drawOval(mSrcR, mPaint);
        }

        private void drawFit(Canvas canvas, int index, Matrix.ScaleToFit stf) {
            canvas.save();

            setSrcR(index);
            mMatrix.setRectToRect(mSrcR, mDstR, stf);
            canvas.concat(mMatrix);
            drawSrcR(canvas, index);

            canvas.restore();

            canvas.drawRect(mDstR, mHairPaint);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            canvas.translate(10, 10);

            canvas.save();
            for (int i = 0; i < N; i++) {
                setSrcR(i);
                drawSrcR(canvas, i);
                canvas.translate(mSrcR.width() + 15, 0);
            }
            canvas.restore();

            canvas.translate(0, 100);
            for (int j = 0; j < sFits.length; j++) {
                canvas.save();
                for (int i = 0; i < N; i++) {
                    drawFit(canvas, i, sFits[j]);
                    canvas.translate(mDstR.width() + 8, 0);
                }
                canvas.drawText(sFitLabels[j], 0, HEIGHT*2/3, mLabelPaint);
                canvas.restore();
                canvas.translate(0, 80);
            }
        }
    }
}
