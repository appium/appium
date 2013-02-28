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

import android.app.TabActivity;
import android.os.Bundle;
import android.widget.TabHost;
import android.content.Intent;

/**
 * An example of tab content that launches an activity via {@link android.widget.TabHost.TabSpec#setContent(android.content.Intent)}
 */
public class Tabs3 extends TabActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final TabHost tabHost = getTabHost();

        tabHost.addTab(tabHost.newTabSpec("tab1")
                .setIndicator("list")
                .setContent(new Intent(this, List1.class)));

        tabHost.addTab(tabHost.newTabSpec("tab2")
                .setIndicator("photo list")
                .setContent(new Intent(this, List8.class)));
        
        // This tab sets the intent flag so that it is recreated each time
        // the tab is clicked.
        tabHost.addTab(tabHost.newTabSpec("tab3")
                .setIndicator("destroy")
                .setContent(new Intent(this, Controls1.class)
                        .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)));
    }
}
