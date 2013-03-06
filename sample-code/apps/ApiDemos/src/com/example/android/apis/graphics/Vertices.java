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

import com.example.android.apis.R;

import android.content.Context;
import android.graphics.*;
import android.os.Bundle;
import android.view.*;

public class Vertices extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private final Paint mPaint = new Paint();
        private final float[] mVerts = new float[10];
        private final float[] mTexs = new float[10];
        private final short[] mIndices = { 0, 1, 2, 3, 4, 1 };

        private final Matrix mMatrix = new Matrix();
        private final Matrix mInverse = new Matrix();

        private static void setXY(float[] array, int index, float x, float y) {
            array[index*2 + 0] = x;
            array[index*2 + 1] = y;
        }

        public SampleView(Context context) {
            super(context);
            setFocusable(true);

            Bitmap bm = BitmapFactory.decodeResource(getResources(),
                                                     R.drawable.beach);
            Shader s = new BitmapShader(bm, Shader.TileMode.CLAMP,
                                        Shader.TileMode.CLAMP);
            mPaint.setShader(s);

            float w = bm.getWidth();
            float h = bm.getHeight();
            // construct our mesh
            setXY(mTexs, 0, w/2, h/2);
            setXY(mTexs, 1, 0, 0);
            setXY(mTexs, 2, w, 0);
            setXY(mTexs, 3, w, h);
            setXY(mTexs, 4, 0, h);

            setXY(mVerts, 0, w/2, h/2);
            setXY(mVerts, 1, 0, 0);
            setXY(mVerts, 2, w, 0);
            setXY(mVerts, 3, w, h);
            setXY(mVerts, 4, 0, h);

            mMatrix.setScale(0.8f, 0.8f);
            mMatrix.preTranslate(20, 20);
            mMatrix.invert(mInverse);
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(0xFFCCCCCC);
            canvas.save();
            canvas.concat(mMatrix);

            canvas.drawVertices(Canvas.VertexMode.TRIANGLE_FAN, 10, mVerts, 0,
                                mTexs, 0, null, 0, null, 0, 0, mPaint);

            canvas.translate(0, 240);
            canvas.drawVertices(Canvas.VertexMode.TRIANGLE_FAN, 10, mVerts, 0,
                                mTexs, 0, null, 0, mIndices, 0, 6, mPaint);

            canvas.restore();
        }

        @Override public boolean onTouchEvent(MotionEvent event) {
            float[] pt = { event.getX(), event.getY() };
            mInverse.mapPoints(pt);
            setXY(mVerts, 0, pt[0], pt[1]);
            invalidate();
            return true;
        }

    }
}

