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

package com.example.android.apis.graphics.kube;

public class GLColor {

    public final int red;
    public final int green;
    public final int blue;
    public final int alpha;

    public GLColor(int red, int green, int blue, int alpha) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = alpha;
    }

    public GLColor(int red, int green, int blue) {
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.alpha = 0x10000;
    }

    @Override
    public boolean equals(Object other) {
        if (other instanceof GLColor) {
            GLColor color = (GLColor)other;
            return (red == color.red &&
                    green == color.green &&
                    blue == color.blue &&
                    alpha == color.alpha);
        }
        return false;
    }
}
