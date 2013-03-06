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

import java.io.ByteArrayOutputStream;

public class CreateBitmap extends GraphicsActivity {

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
        private Bitmap[] mBitmaps;
        private Bitmap[] mJPEG;
        private Bitmap[] mPNG;
        private int[]    mColors;
        private Paint    mPaint;

        private static Bitmap codec(Bitmap src, Bitmap.CompressFormat format,
                                    int quality) {
            ByteArrayOutputStream os = new ByteArrayOutputStream();
            src.compress(format, quality, os);

            byte[] array = os.toByteArray();
            return BitmapFactory.decodeByteArray(array, 0, array.length);
        }

        public SampleView(Context context) {
            super(context);
            setFocusable(true);

            mColors = createColors();
            int[] colors = mColors;

            mBitmaps = new Bitmap[6];
            // these three are initialized with colors[]
            mBitmaps[0] = Bitmap.createBitmap(colors, 0, STRIDE, WIDTH, HEIGHT,
                                              Bitmap.Config.ARGB_8888);
            mBitmaps[1] = Bitmap.createBitmap(colors, 0, STRIDE, WIDTH, HEIGHT,
                                              Bitmap.Config.RGB_565);
            mBitmaps[2] = Bitmap.createBitmap(colors, 0, STRIDE, WIDTH, HEIGHT,
                                              Bitmap.Config.ARGB_4444);

            // these three will have their colors set later
            mBitmaps[3] = Bitmap.createBitmap(WIDTH, HEIGHT,
                                              Bitmap.Config.ARGB_8888);
            mBitmaps[4] = Bitmap.createBitmap(WIDTH, HEIGHT,
                                              Bitmap.Config.RGB_565);
            mBitmaps[5] = Bitmap.createBitmap(WIDTH, HEIGHT,
                                              Bitmap.Config.ARGB_4444);
            for (int i = 3; i <= 5; i++) {
                mBitmaps[i].setPixels(colors, 0, STRIDE, 0, 0, WIDTH, HEIGHT);
            }

            mPaint = new Paint();
            mPaint.setDither(true);

            // now encode/decode using JPEG and PNG
            mJPEG = new Bitmap[mBitmaps.length];
            mPNG = new Bitmap[mBitmaps.length];
            for (int i = 0; i < mBitmaps.length; i++) {
                mJPEG[i] = codec(mBitmaps[i], Bitmap.CompressFormat.JPEG, 80);
                mPNG[i] = codec(mBitmaps[i], Bitmap.CompressFormat.PNG, 0);
            }
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            for (int i = 0; i < mBitmaps.length; i++) {
                canvas.drawBitmap(mBitmaps[i], 0, 0, null);
                canvas.drawBitmap(mJPEG[i], 80, 0, null);
                canvas.drawBitmap(mPNG[i], 160, 0, null);
                canvas.translate(0, mBitmaps[i].getHeight());
            }

            // draw the color array directly, w/o craeting a bitmap object
            canvas.drawBitmap(mColors, 0, STRIDE, 0, 0, WIDTH, HEIGHT,
                              true, null);
            canvas.translate(0, HEIGHT);
            canvas.drawBitmap(mColors, 0, STRIDE, 0, 0, WIDTH, HEIGHT,
                              false, mPaint);
        }
    }
}

