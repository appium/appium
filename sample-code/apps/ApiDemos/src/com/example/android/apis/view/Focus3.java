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

package com.example.android.apis.view;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Button;
import com.example.android.apis.R;

public class Focus3 extends Activity {
    private Button mTopButton;
    private Button mBottomButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.focus_3);

        mTopButton = (Button) findViewById(R.id.top);
        mBottomButton = (Button) findViewById(R.id.bottom);
    }

    public Button getTopButton() {
        return mTopButton;
    }

    public Button getBottomButton() {
        return mBottomButton;
    }
}
