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

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.ContactsContract;
import android.telephony.SmsMessage;

public class SmsMessageReceiver extends BroadcastReceiver {
    /** Tag string for our debug logs */
    private static final String TAG = "SmsMessageReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle extras = intent.getExtras();
        if (extras == null)
            return;

        Object[] pdus = (Object[]) extras.get("pdus");

        for (int i = 0; i < pdus.length; i++) {
            SmsMessage message = SmsMessage.createFromPdu((byte[]) pdus[i]);
            String fromAddress = message.getOriginatingAddress();
            String fromDisplayName = fromAddress;

            Uri uri;
            String[] projection;

            // If targeting Donut or below, use
            // Contacts.Phones.CONTENT_FILTER_URL and
            // Contacts.Phones.DISPLAY_NAME
            uri = Uri.withAppendedPath(
                    ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
                    Uri.encode(fromAddress));
            projection = new String[] { ContactsContract.PhoneLookup.DISPLAY_NAME };

            // Query the filter URI
            Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null);
            if (cursor != null) {
                if (cursor.moveToFirst())
                    fromDisplayName = cursor.getString(0);

                cursor.close();
            }

            // Trigger the main activity to fire up a dialog that shows/reads the received messages
            Intent di = new Intent();
            di.setClass(context, SmsReceivedDialog.class);
            di.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            di.putExtra(SmsReceivedDialog.SMS_FROM_ADDRESS_EXTRA, fromAddress);
            di.putExtra(SmsReceivedDialog.SMS_FROM_DISPLAY_NAME_EXTRA, fromDisplayName);
            di.putExtra(SmsReceivedDialog.SMS_MESSAGE_EXTRA, message.getMessageBody().toString());
            context.startActivity(di);

            // For the purposes of this demo, we'll only handle the first received message.
            break;
        }
    }
}
