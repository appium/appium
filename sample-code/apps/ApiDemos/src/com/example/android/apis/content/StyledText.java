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

package com.example.android.apis.content;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;


/**
 * Demonstration of styled text resources.
 */
public class StyledText extends Activity
{
    @Override
	protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        // See assets/res/any/layout/styled_text.xml for this
        // view layout definition.
        setContentView(R.layout.styled_text);

        // Programmatically retrieve a string resource with style
        // information and apply it to the second text view.  Note the
        // use of CharSequence instead of String so we don't lose
        // the style info.
        CharSequence str = getText(R.string.styled_text);
        TextView tv = (TextView)findViewById(R.id.text);
        tv.setText(str);
    }
}

