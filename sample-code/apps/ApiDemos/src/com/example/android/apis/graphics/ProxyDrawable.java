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

import android.graphics.Canvas;
import android.graphics.ColorFilter;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;

public class ProxyDrawable extends Drawable {

    private Drawable mProxy;
    private boolean mMutated;

    public ProxyDrawable(Drawable target) {
        mProxy = target;
    }

    public Drawable getProxy() {
        return mProxy;
    }

    public void setProxy(Drawable proxy) {
        if (proxy != this) {
            mProxy = proxy;
        }
    }

    @Override
    public void draw(Canvas canvas) {
        if (mProxy != null) {
            mProxy.draw(canvas);
        }
    }

    @Override
    public int getIntrinsicWidth() {
        return mProxy != null ? mProxy.getIntrinsicWidth() : -1;
    }

    @Override
    public int getIntrinsicHeight() {
        return mProxy != null ? mProxy.getIntrinsicHeight() : -1;
    }

    @Override
    public int getOpacity() {
        return mProxy != null ? mProxy.getOpacity() : PixelFormat.TRANSPARENT;
    }

    @Override
    public void setFilterBitmap(boolean filter) {
        if (mProxy != null) {
            mProxy.setFilterBitmap(filter);
        }
    }

    @Override
    public void setDither(boolean dither) {
        if (mProxy != null) {
            mProxy.setDither(dither);
        }
    }

    @Override
    public void setColorFilter(ColorFilter colorFilter) {
        if (mProxy != null) {
            mProxy.setColorFilter(colorFilter);
        }
    }

    @Override
    public void setAlpha(int alpha) {
        if (mProxy != null) {
            mProxy.setAlpha(alpha);
        }
    }

    @Override
    public Drawable mutate() {
        if (mProxy != null && !mMutated && super.mutate() == this) {
            mProxy.mutate();
            mMutated = true;
        }
        return this;
    }
}

