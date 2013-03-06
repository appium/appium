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
import android.view.*;

public class Layers extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private static final int LAYER_FLAGS = Canvas.MATRIX_SAVE_FLAG |
                                            Canvas.CLIP_SAVE_FLAG |
                                            Canvas.HAS_ALPHA_LAYER_SAVE_FLAG |
                                            Canvas.FULL_COLOR_LAYER_SAVE_FLAG |
                                            Canvas.CLIP_TO_LAYER_SAVE_FLAG;

        private Paint mPaint;

        public SampleView(Context context) {
            super(context);
            setFocusable(true);

            mPaint = new Paint();
            mPaint.setAntiAlias(true);
        }

        @Override protected void onDraw(Canvas canvas) {
            canvas.drawColor(Color.WHITE);

            canvas.translate(10, 10);

            canvas.saveLayerAlpha(0, 0, 200, 200, 0x88, LAYER_FLAGS);

            mPaint.setColor(Color.RED);
            canvas.drawCircle(75, 75, 75, mPaint);
            mPaint.setColor(Color.BLUE);
            canvas.drawCircle(125, 125, 75, mPaint);

            canvas.restore();
        }
    }
}

