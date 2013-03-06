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

package com.example.android.apis.view;

import com.example.android.apis.R;

import android.app.TabActivity;
import android.os.Bundle;
import android.view.View;
import android.widget.TabHost;
import android.widget.TextView;

/**
 * Demonstrates the Tab scrolling when too many tabs are displayed to fit in the screen.
 */
public class Tabs5 extends TabActivity implements TabHost.TabContentFactory {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.tabs_scroll);

        final TabHost tabHost = getTabHost();

        for (int i=1; i <= 30; i++) {
            String name = "Tab " + i;
            tabHost.addTab(tabHost.newTabSpec(name)
                    .setIndicator(name)
                    .setContent(this));
        }
    }

    /** {@inheritDoc} */
    public View createTabContent(String tag) {
        final TextView tv = new TextView(this);
        tv.setText("Content for tab with tag " + tag);
        return tv;
    }
}
