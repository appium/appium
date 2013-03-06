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

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.BitmapFactory.Options;
import android.view.View;

import java.io.ByteArrayOutputStream;

/**
 * PurgeableBitmapView works with PurgeableBitmap to demonstrate the effects of setting
 * Bitmaps as being purgeable.
 *
 * PurgeableBitmapView decodes an encoded bitstream to a Bitmap each time update()
 * is invoked(), and its onDraw() draws the Bitmap and a number to screen.
 * The number is used to indicate the number of Bitmaps that has been decoded.
 */
public class PurgeableBitmapView extends View {
    private final byte[] bitstream;

    private Bitmap mBitmap;
    private final int mArraySize = 200;
    private final Bitmap[] mBitmapArray = new Bitmap [mArraySize];
    private final Options mOptions = new Options();
    private static final int WIDTH = 150;
    private static final int HEIGHT = 450;
    private static final int STRIDE = 320;   // must be >= WIDTH
    private int mDecodingCount = 0;
    private final Paint mPaint = new Paint();
    private final int textSize = 32;
    private static int delay = 100;

    public PurgeableBitmapView(Context context, boolean isPurgeable) {
        super(context);
        setFocusable(true);
        mOptions.inPurgeable = isPurgeable;

        int[] colors = createColors();
        Bitmap src = Bitmap.createBitmap(colors, 0, STRIDE, WIDTH, HEIGHT,
                Bitmap.Config.ARGB_8888);
        bitstream = generateBitstream(src, Bitmap.CompressFormat.JPEG, 80);

        mPaint.setTextSize(textSize);
        mPaint.setColor(Color.GRAY);
    }

    private int[] createColors() {
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

    public int update(PurgeableBitmap.RefreshHandler handler) {
        try {
            mBitmapArray[mDecodingCount] = BitmapFactory.decodeByteArray(
                bitstream, 0, bitstream.length, mOptions);
            mBitmap = mBitmapArray[mDecodingCount];
            mDecodingCount++;
            if (mDecodingCount < mArraySize) {
                handler.sleep(delay);
                return 0;
            } else {
                return -mDecodingCount;
            }

        } catch (OutOfMemoryError error) {
            for (int i = 0; i < mDecodingCount; i++) {
                mBitmapArray[i].recycle();
            }
            return mDecodingCount + 1;
        }
    }

    @Override protected void onDraw(Canvas canvas) {
        canvas.drawColor(Color.WHITE);
        canvas.drawBitmap(mBitmap, 0, 0, null);
        canvas.drawText(String.valueOf(mDecodingCount), WIDTH / 2 - 20,
            HEIGHT / 2, mPaint);
    }

    private byte[] generateBitstream(Bitmap src, Bitmap.CompressFormat format,
            int quality) {
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        src.compress(format, quality, os);
        return os.toByteArray();
    }

}
