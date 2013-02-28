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

import java.util.List;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.telephony.SmsManager;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.CompoundButton.OnCheckedChangeListener;

import com.example.android.apis.R;

public class SmsMessagingDemo extends Activity {
    /** Tag string for our debug logs */
    private static final String TAG = "SmsMessagingDemo";

    public static final String SMS_RECIPIENT_EXTRA = "com.example.android.apis.os.SMS_RECIPIENT";

    public static final String ACTION_SMS_SENT = "com.example.android.apis.os.SMS_SENT_ACTION";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.sms_demo);

        if (getIntent().hasExtra(SMS_RECIPIENT_EXTRA)) {
            ((TextView) findViewById(R.id.sms_recipient)).setText(getIntent().getExtras()
                    .getString(SMS_RECIPIENT_EXTRA));
            ((TextView) findViewById(R.id.sms_content)).requestFocus();
        }

        // Enable or disable the broadcast receiver depending on the checked
        // state of the checkbox.
        CheckBox enableCheckBox = (CheckBox) findViewById(R.id.sms_enable_receiver);

        final PackageManager pm = this.getPackageManager();
        final ComponentName componentName = new ComponentName("com.example.android.apis",
                "com.example.android.apis.os.SmsMessageReceiver");

        enableCheckBox.setChecked(pm.getComponentEnabledSetting(componentName) ==
                                  PackageManager.COMPONENT_ENABLED_STATE_ENABLED);

        enableCheckBox.setOnCheckedChangeListener(new OnCheckedChangeListener() {
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                Log.d(TAG, (isChecked ? "Enabling" : "Disabling") + " SMS receiver");

                pm.setComponentEnabledSetting(componentName,
                        isChecked ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                                : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP);
            }
        });

        final EditText recipientTextEdit = (EditText) SmsMessagingDemo.this
                .findViewById(R.id.sms_recipient);
        final EditText contentTextEdit = (EditText) SmsMessagingDemo.this
                .findViewById(R.id.sms_content);
        final TextView statusView = (TextView) SmsMessagingDemo.this.findViewById(R.id.sms_status);

        // Watch for send button clicks and send text messages.
        Button sendButton = (Button) findViewById(R.id.sms_send_message);
        sendButton.setOnClickListener(new OnClickListener() {
            public void onClick(View v) {
                if (TextUtils.isEmpty(recipientTextEdit.getText())) {
                    Toast.makeText(SmsMessagingDemo.this, "Please enter a message recipient.",
                            Toast.LENGTH_SHORT).show();
                    return;
                }

                if (TextUtils.isEmpty(contentTextEdit.getText())) {
                    Toast.makeText(SmsMessagingDemo.this, "Please enter a message body.",
                            Toast.LENGTH_SHORT).show();
                    return;
                }

                recipientTextEdit.setEnabled(false);
                contentTextEdit.setEnabled(false);

                SmsManager sms = SmsManager.getDefault();

                List<String> messages = sms.divideMessage(contentTextEdit.getText().toString());

                String recipient = recipientTextEdit.getText().toString();
                for (String message : messages) {
                    sms.sendTextMessage(recipient, null, message, PendingIntent.getBroadcast(
                            SmsMessagingDemo.this, 0, new Intent(ACTION_SMS_SENT), 0), null);
                }
            }
        });

        // Register broadcast receivers for SMS sent and delivered intents
        registerReceiver(new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String message = null;
                boolean error = true;
                switch (getResultCode()) {
                case Activity.RESULT_OK:
                    message = "Message sent!";
                    error = false;
                    break;
                case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                    message = "Error.";
                    break;
                case SmsManager.RESULT_ERROR_NO_SERVICE:
                    message = "Error: No service.";
                    break;
                case SmsManager.RESULT_ERROR_NULL_PDU:
                    message = "Error: Null PDU.";
                    break;
                case SmsManager.RESULT_ERROR_RADIO_OFF:
                    message = "Error: Radio off.";
                    break;
                }

                recipientTextEdit.setEnabled(true);
                contentTextEdit.setEnabled(true);
                contentTextEdit.setText("");

                statusView.setText(message);
                statusView.setTextColor(error ? Color.RED : Color.GREEN);
            }
        }, new IntentFilter(ACTION_SMS_SENT));
    }
}
