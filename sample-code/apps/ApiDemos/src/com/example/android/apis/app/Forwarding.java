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

package com.example.android.apis.app;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;


/**
 * <p>Example of removing yourself from the history stack after forwarding to
 * another activity. This can be useful, for example, to implement
    a confirmation dialog before the user goes on to another activity -- once the
    user has confirmed this operation, they should not see the dialog again if they
go back from it.</p>

<p>Note that another way to implement a confirmation dialog would be as
an activity that returns a result to its caller.  Either approach can be
useful depending on how it makes sense to structure the application.</p>

<h4>Demo</h4>
App/Activity/Receive Result
 
<h4>Source files</h4>
<table class="LinkTable">
        <tr>
            <td class="LinkColumn">src/com.example.android.apis/app/Forwarding.java</td>
            <td class="DescrColumn">Forwards the user to another activity when its button is pressed</td>
        </tr>
        <tr>
            <td class="LinkColumn">/res/any/layout/forwarding.xml</td>
            <td class="DescrColumn">Defines contents of the Forwarding screen</td>
        </tr>
</table>
 */
public class Forwarding extends Activity
{
    @Override
	protected void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.forwarding);

        // Watch for button clicks.
        Button goButton = (Button)findViewById(R.id.go);
        goButton.setOnClickListener(mGoListener);
    }

    private OnClickListener mGoListener = new OnClickListener()
    {
        public void onClick(View v)
        {
            // Here we start the next activity, and then call finish()
            // so that our own will stop running and be removed from the
            // history stack.
            Intent intent = new Intent();
            intent.setClass(Forwarding.this, ForwardTarget.class);
            startActivity(intent);
            finish();
        }
    };
}

