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

package com.example.android.apis.content;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.SystemClock;
import android.os.Bundle;
import android.provider.BaseColumns;
import android.provider.ContactsContract;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.Toast;

import java.util.Calendar;

/**
 * Demonstrates launching the contacts app to pick a contact.  Does not
 * require permission to read contacts, as that permission will be granted
 * when the selected contact is returned.
 */
public class PickContact extends Activity {
    Toast mToast;
    ResultDisplayer mPendingResult;

    class ResultDisplayer implements OnClickListener {
        String mMsg;
        String mMimeType;
        
        ResultDisplayer(String msg, String mimeType) {
            mMsg = msg;
            mMimeType = mimeType;
        }
        
        public void onClick(View v) {
            Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.setType(mMimeType);
            mPendingResult = this;
            startActivityForResult(intent, 1);
        }
    }
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.pick_contact);

        // Watch for button clicks.
        ((Button)findViewById(R.id.pick_contact)).setOnClickListener(
                new ResultDisplayer("Selected contact",
                        ContactsContract.Contacts.CONTENT_ITEM_TYPE));
        ((Button)findViewById(R.id.pick_person)).setOnClickListener(
                new ResultDisplayer("Selected person",
                        "vnd.android.cursor.item/person"));
        ((Button)findViewById(R.id.pick_phone)).setOnClickListener(
                new ResultDisplayer("Selected phone",
                        ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE));
        ((Button)findViewById(R.id.pick_address)).setOnClickListener(
                new ResultDisplayer("Selected address",
                        ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                Cursor c = null;
                try {
                    c = getContentResolver().query(uri, new String[] { BaseColumns._ID },
                            null, null, null);
                    if (c != null && c.moveToFirst()) {
                        int id = c.getInt(0);
                        if (mToast != null) {
                            mToast.cancel();
                        }
                        String txt = mPendingResult.mMsg + ":\n" + uri + "\nid: " + id;
                        mToast = Toast.makeText(this, txt, Toast.LENGTH_LONG);
                        mToast.show();
                    }
                } finally {
                    if (c != null) {
                        c.close();
                    }
                }
            }
        }
    }
}

