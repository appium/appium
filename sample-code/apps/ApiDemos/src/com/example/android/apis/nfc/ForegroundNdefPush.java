/*
 * Copyright (C) 2011 The Android Open Source Project
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
 * limitations under the License
 */

package com.example.android.apis.nfc;

import com.example.android.apis.R;

import android.app.Activity;
import android.nfc.NdefMessage;
import android.nfc.NdefRecord;
import android.nfc.NfcAdapter;
import android.os.Bundle;
import android.widget.TextView;

/**
 * An example of how to use the NFC foreground NDEF push APIs.
 */
public class ForegroundNdefPush extends Activity {
    private NfcAdapter mAdapter;
    private TextView mText;
    private NdefMessage mMessage;

    @Override
    public void onCreate(Bundle savedState) {
        super.onCreate(savedState);

        mAdapter = NfcAdapter.getDefaultAdapter(this);

        // Create an NDEF message a URL
        mMessage = new NdefMessage(NdefRecord.createUri("http://www.android.com"));

        setContentView(R.layout.foreground_dispatch);
        mText = (TextView) findViewById(R.id.text);

        if (mAdapter != null) {
            mAdapter.setNdefPushMessage(mMessage, this);
            mText.setText("Tap another Android phone with NFC to push a URL");
        } else {
            mText.setText("This phone is not NFC enabled.");
        }
    }
}
