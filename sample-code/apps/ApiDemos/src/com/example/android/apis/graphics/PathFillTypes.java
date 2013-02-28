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

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
//import com.example.android.apis.R;

import android.content.Context;
import android.graphics.*;
import android.os.Bundle;
import android.view.View;

public class PathFillTypes extends GraphicsActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(new SampleView(this));
    }

    private static class SampleView extends View {
        private Paint mPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        private Path mPath;

        public SampleView(Context context) {
            super(context);
            setFocusable(true);
            setFocusableInTouchMode(true);

            mPath = new Path();
            mPath.addCircle(40, 40, 45, Path.Direction.CCW);
            mPath.addCircle(80, 80, 45, Path.Direction.CCW);
        }

        private void showPath(Canvas canvas, int x, int y, Path.FillType ft,
                              Paint paint) {
            canvas.save();
            canvas.translate(x, y);
            canvas.clipRect(0, 0, 120, 120);
            canvas.drawColor(Color.WHITE);
            mPath.setFillType(ft);
            canvas.drawPath(mPath, paint);
            canvas.restore();
        }

        @Override protected void onDraw(Canvas canvas) {
            Paint paint = mPaint;

            canvas.drawColor(0xFFCCCCCC);

            canvas.translate(20, 20);

            paint.setAntiAlias(true);

            showPath(canvas, 0, 0, Path.FillType.WINDING, paint);
            showPath(canvas, 160, 0, Path.FillType.EVEN_ODD, paint);
            showPath(canvas, 0, 160, Path.FillType.INVERSE_WINDING, paint);
            showPath(canvas, 160, 160, Path.FillType.INVERSE_EVEN_ODD, paint);
        }
    }
}

