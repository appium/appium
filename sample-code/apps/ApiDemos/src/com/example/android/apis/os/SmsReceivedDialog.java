/*
 * Copyright (C) 2010 The Android Open Source Project
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

import java.util.Locale;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.TextToSpeech.OnInitListener;
import android.util.Log;

import com.example.android.apis.R;

public class SmsReceivedDialog extends Activity implements OnInitListener {
    private static final String TAG = "SmsReceivedDialog";

    private static final int DIALOG_SHOW_MESSAGE = 1;

    public static final String SMS_FROM_ADDRESS_EXTRA = "com.example.android.apis.os.SMS_FROM_ADDRESS";
    public static final String SMS_FROM_DISPLAY_NAME_EXTRA = "com.example.android.apis.os.SMS_FROM_DISPLAY_NAME";
    public static final String SMS_MESSAGE_EXTRA = "com.example.android.apis.os.SMS_MESSAGE";

    private TextToSpeech mTts;

    private String mFromDisplayName;
    private String mFromAddress;
    private String mMessage;
    private String mFullBodyString;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        mFromAddress = getIntent().getExtras().getString(SMS_FROM_ADDRESS_EXTRA);
        mFromDisplayName = getIntent().getExtras().getString(SMS_FROM_DISPLAY_NAME_EXTRA);
        mMessage = getIntent().getExtras().getString(SMS_MESSAGE_EXTRA);

        mFullBodyString = String.format(
                getResources().getString(R.string.sms_speak_string_format),
                mFromDisplayName,
                mMessage);

        showDialog(DIALOG_SHOW_MESSAGE);
        mTts = new TextToSpeech(this, this);
    }

    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            int result = mTts.setLanguage(Locale.US);
            if (result == TextToSpeech.LANG_MISSING_DATA
                    || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "TTS language is not available.");
            } else {
                mTts.speak(mFullBodyString, TextToSpeech.QUEUE_ADD, null);
            }
        } else {
            // Initialization failed.
            Log.e(TAG, "Could not initialize TTS.");
        }
    }

    @Override
    protected Dialog onCreateDialog(int id) {
        switch (id) {
        case DIALOG_SHOW_MESSAGE:
            return new AlertDialog.Builder(this)
                    .setIcon(android.R.drawable.ic_dialog_email)
                    .setTitle("Message Received")
                    .setMessage(mFullBodyString)
                    .setPositiveButton(R.string.reply, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int whichButton) {
                            // Begin creating the reply with the SmsMessagingDemo activity
                            Intent i = new Intent();
                            i.setClass(SmsReceivedDialog.this, SmsMessagingDemo.class);
                            i.putExtra(SmsMessagingDemo.SMS_RECIPIENT_EXTRA, mFromAddress);
                            startActivity(i);

                            dialog.dismiss();
                            finish();
                        }
                    })
                    .setNegativeButton(R.string.dismiss, new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int whichButton) {
                            dialog.dismiss();
                            finish();
                        }
                    })
                    .setOnCancelListener(new DialogInterface.OnCancelListener() {
                        public void onCancel(DialogInterface dialog) {
                            finish();
                        }
                    }).create();
        }
        return null;
    }
}
