 /*
 * Copyright (C) 2009 The Android Open Source Project
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

import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.view.View;
import android.widget.Button;

import com.example.android.apis.R;

import java.util.Locale;
import java.util.Random;

/**
 * <p>Demonstrates text-to-speech (TTS). Please note the following steps:</p>
 *
 * <ol>
 * <li>Construct the TextToSpeech object.</li>
 * <li>Handle initialization callback in the onInit method.
 * The activity implements TextToSpeech.OnInitListener for this purpose.</li>
 * <li>Call TextToSpeech.speak to synthesize speech.</li>
 * <li>Shutdown TextToSpeech in onDestroy.</li>
 * </ol>
 *
 * <p>Documentation:
 * http://developer.android.com/reference/android/speech/tts/package-summary.html
 * </p>
 * <ul>
 */
public class TextToSpeechActivity extends Activity implements TextToSpeech.OnInitListener {

    private static final String TAG = "TextToSpeechDemo";

    private TextToSpeech mTts;
    private Button mAgainButton;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.text_to_speech);

        // Initialize text-to-speech. This is an asynchronous operation.
        // The OnInitListener (second argument) is called after initialization completes.
        mTts = new TextToSpeech(this,
            this  // TextToSpeech.OnInitListener
            );

        // The button is disabled in the layout.
        // It will be enabled upon initialization of the TTS engine.
        mAgainButton = (Button) findViewById(R.id.again_button);

        mAgainButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                sayHello();
            }
        });
    }

    @Override
    public void onDestroy() {
        // Don't forget to shutdown!
        if (mTts != null) {
            mTts.stop();
            mTts.shutdown();
        }

        super.onDestroy();
    }

    // Implements TextToSpeech.OnInitListener.
    public void onInit(int status) {
        // status can be either TextToSpeech.SUCCESS or TextToSpeech.ERROR.
        if (status == TextToSpeech.SUCCESS) {
            // Set preferred language to US english.
            // Note that a language may not be available, and the result will indicate this.
            int result = mTts.setLanguage(Locale.US);
            // Try this someday for some interesting results.
            // int result mTts.setLanguage(Locale.FRANCE);
            if (result == TextToSpeech.LANG_MISSING_DATA ||
                result == TextToSpeech.LANG_NOT_SUPPORTED) {
               // Lanuage data is missing or the language is not supported.
                Log.e(TAG, "Language is not available.");
            } else {
                // Check the documentation for other possible result codes.
                // For example, the language may be available for the locale,
                // but not for the specified country and variant.

                // The TTS engine has been successfully initialized.
                // Allow the user to press the button for the app to speak again.
                mAgainButton.setEnabled(true);
                // Greet the user.
                sayHello();
            }
        } else {
            // Initialization failed.
            Log.e(TAG, "Could not initialize TextToSpeech.");
        }
    }

    private static final Random RANDOM = new Random();
    private static final String[] HELLOS = {
      "Hello",
      "Salutations",
      "Greetings",
      "Howdy",
      "What's crack-a-lackin?",
      "That explains the stench!"
    };

    private void sayHello() {
        // Select a random hello.
        int helloLength = HELLOS.length;
        String hello = HELLOS[RANDOM.nextInt(helloLength)];
        mTts.speak(hello,
            TextToSpeech.QUEUE_FLUSH,  // Drop all pending entries in the playback queue.
            null);
    }

}
