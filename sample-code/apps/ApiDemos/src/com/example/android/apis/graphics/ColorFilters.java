/*
 * Copyright (C) 2009 The Android Open Source Project
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

import com.example.android.apis.R;

import android.app.Activity;
import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.*;
import android.os.Bundle;
import android.view.*;

public class ColorFilters extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));

    }

    private static class SampleView extends View {
        private Activity mActivity;
        private Drawable mDrawable;
        private Drawable[] mDrawables;
        private Paint mPaint;
        private Paint mPaint2;
        private float mPaintTextOffset;
        private int[] mColors;
        private PorterDuff.Mode[] mModes;
        private int mModeIndex;

        private static void addToTheRight(Drawable curr, Drawable prev) {
            Rect r = prev.getBounds();
            int x = r.right + 12;
            int center = (r.top + r.bottom) >> 1;
            int h = curr.getIntrinsicHeight();
            int y = center - (h >> 1);

            curr.setBounds(x, y, x + curr.getIntrinsicWidth(), y + h);
        }

        public SampleView(Activity activity) {
            super(activity);
            mActivity = activity;
            Context context = activity;
            setFocusable(true);

            mDrawable = context.getResources().getDrawable(R.drawable.btn_default_normal);
            mDrawable.setBounds(0, 0, 150, 48);
            mDrawable.setDither(true);

            int[] resIDs = new int[] {
                R.drawable.btn_circle_normal,
                R.drawable.btn_check_off,
                R.drawable.btn_check_on
            };
            mDrawables = new Drawable[resIDs.length];
            Drawable prev = mDrawable;
            for (int i = 0; i < resIDs.length; i++) {
                mDrawables[i] = context.getResources().getDrawable(resIDs[i]);
                mDrawables[i].setDither(true);
                addToTheRight(mDrawables[i], prev);
                prev = mDrawables[i];
            }

            mPaint = new Paint();
            mPaint.setAntiAlias(true);
            mPaint.setTextSize(16);
            mPaint.setTextAlign(Paint.Align.CENTER);

            mPaint2 = new Paint(mPaint);
            mPaint2.setAlpha(64);

            Paint.FontMetrics fm = mPaint.getFontMetrics();
            mPaintTextOffset = (fm.descent + fm.ascent) * 0.5f;

            mColors = new int[] {
                0,
                0xCC0000FF,
                0x880000FF,
                0x440000FF,
                0xFFCCCCFF,
                0xFF8888FF,
                0xFF4444FF,
            };

            mModes = new PorterDuff.Mode[] {
                PorterDuff.Mode.SRC_ATOP,
                PorterDuff.Mode.MULTIPLY,
            };
            mModeIndex = 0;

            updateTitle();
        }

        private void swapPaintColors() {
            if (mPaint.getColor() == 0xFF000000) {
                mPaint.setColor(0xFFFFFFFF);
                mPaint2.setColor(0xFF000000);
            } else {
                mPaint.setColor(0xFF000000);
                mPaint2.setColor(0xFFFFFFFF);
            }
            mPaint2.setAlpha(64);
        }

        private void updateTitle() {
            mActivity.setTitle(mModes[mModeIndex].toString());
        }

        private void drawSample(Canvas canvas, ColorFilter filter) {
            Rect r = mDrawable.getBounds();
            float x = (r.left + r.right) * 0.5f;
            float y = (r.top + r.bottom) * 0.5f - mPaintTextOffset;

            mDrawable.setColorFilter(filter);
            mDrawable.draw(canvas);
            canvas.drawText("Label", x+1, y+1, mPaint2);
            canvas.drawText("Label", x, y, mPaint);

            for (Drawable dr : mDrawables) {
                dr.setColorFilter(filter);
                dr.draw(canvas);
            }
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(0xFFCCCCCC);

            canvas.translate(8, 12);
            for (int color : mColors) {
                ColorFilter filter;
                if (color == 0) {
                    filter = null;
                } else {
                    filter = new PorterDuffColorFilter(color,
                                                       mModes[mModeIndex]);
                }
                drawSample(canvas, filter);
                canvas.translate(0, 55);
            }
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    break;
                case MotionEvent.ACTION_MOVE:
                    break;
                case MotionEvent.ACTION_UP:
                    // update mode every other time we change paint colors
                    if (mPaint.getColor() == 0xFFFFFFFF) {
                        mModeIndex = (mModeIndex + 1) % mModes.length;
                        updateTitle();
                    }
                    swapPaintColors();
                    invalidate();
                    break;
            }
            return true;
        }
    }
}
