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

package com.example.android.apis.os;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.os.Vibrator;
import android.view.View;
import android.widget.TextView;
import com.example.android.apis.R;

/**
 * <h3>App that vibrates the vibrator with the Morse Code for a string.</h3>

<p>This demonstrates the {@link android.os.Vibrator android.os.Vibrator} class.

<h4>Demo</h4>
OS / Morse Code Vibrator
 
<h4>Source files</h4>
 * <table class="LinkTable">
 *         <tr>
 *             <td >src/com.example.android.apis/os/MorseCode.java</td>
 *             <td >The Morse Code Vibrator</td>
 *         </tr>
 *         <tr>
 *             <td >res/any/layout/morse_code.xml</td>
 *             <td >Defines contents of the screen</td>
 *         </tr>
 * </table> 
 */
public class MorseCode extends Activity
{
    /** Our text view */
    private TextView mTextView;

    /**
     * Initialization of the Activity after it is first created.  Must at least
     * call {@link android.app.Activity#setContentView setContentView()} to
     * describe what is to be displayed in the screen.
     */
    @Override
	protected void onCreate(Bundle savedInstanceState)
    {
        // Be sure to call the super class.
        super.onCreate(savedInstanceState);

        // See assets/res/any/layout/hello_world.xml for this
        // view layout definition, which is being set here as
        // the content of our screen.
        setContentView(R.layout.morse_code);

        // Set the OnClickListener for the button so we see when it's pressed.
        findViewById(R.id.button).setOnClickListener(mClickListener);

        // Save the text view so we don't have to look it up each time
        mTextView = (TextView)findViewById(R.id.text);
    }

    /** Called when the button is pushed */
    View.OnClickListener mClickListener = new View.OnClickListener() {
        public void onClick(View v) {
            // Get the text out of the view
            String text = mTextView.getText().toString();

            // convert it using the function defined above.  See the docs for
            // android.os.Vibrator for more info about the format of this array
            long[] pattern = MorseCodeConverter.pattern(text);

            // Start the vibration
            Vibrator vibrator = (Vibrator)getSystemService(Context.VIBRATOR_SERVICE);
            vibrator.vibrate(pattern, -1);
        }
    };
}
