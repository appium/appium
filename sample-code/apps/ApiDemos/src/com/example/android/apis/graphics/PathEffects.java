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
import android.view.KeyEvent;
import android.view.View;

public class PathEffects extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private Paint mPaint;
        private Path mPath;
        private PathEffect[] mEffects;
        private int[] mColors;
        private float mPhase;

        private static PathEffect makeDash(float phase) {
            return new DashPathEffect(new float[] { 15, 5, 8, 5 }, phase);
        }

        private static void makeEffects(PathEffect[] e, float phase) {
            e[0] = null;     // no effect
            e[1] = new CornerPathEffect(10);
            e[2] = new DashPathEffect(new float[] {10, 5, 5, 5}, phase);
            e[3] = new PathDashPathEffect(makePathDash(), 12, phase,
                                          PathDashPathEffect.Style.ROTATE);
            e[4] = new ComposePathEffect(e[2], e[1]);
            e[5] = new ComposePathEffect(e[3], e[1]);
        }

        public SampleView(Context context) {
            super(context);
            setFocusable(true);
            setFocusableInTouchMode(true);

            mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            mPaint.setStyle(Paint.Style.STROKE);
            mPaint.setStrokeWidth(6);

            mPath = makeFollowPath();

            mEffects = new PathEffect[6];

            mColors = new int[] { Color.BLACK, Color.RED, Color.BLUE,
                                  Color.GREEN, Color.MAGENTA, Color.BLACK
                                };
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            RectF bounds = new RectF();
            mPath.computeBounds(bounds, false);
            canvas.translate(10 - bounds.left, 10 - bounds.top);

            makeEffects(mEffects, mPhase);
            mPhase += 1;
            invalidate();

            for (int i = 0; i < mEffects.length; i++) {
                mPaint.setPathEffect(mEffects[i]);
                mPaint.setColor(mColors[i]);
                canvas.drawPath(mPath, mPaint);
                canvas.translate(0, 28);
            }
        }

        @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_CENTER:
                    mPath = makeFollowPath();
                    return true;
            }
            return super.onKeyDown(keyCode, event);
        }

        private static Path makeFollowPath() {
            Path p = new Path();
            p.moveTo(0, 0);
            for (int i = 1; i <= 15; i++) {
                p.lineTo(i*20, (float)Math.random() * 35);
            }
            return p;
        }

        private static Path makePathDash() {
            Path p = new Path();
            p.moveTo(4, 0);
            p.lineTo(0, -4);
            p.lineTo(8, -4);
            p.lineTo(12, 0);
            p.lineTo(8, 4);
            p.lineTo(0, 4);
            return p;
        }
    }
}

