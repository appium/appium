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

package com.example.android.apis.view;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;


import android.app.ListActivity;
import android.database.Cursor;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemSelectedListener;
import android.widget.ListAdapter;
import android.widget.SimpleCursorAdapter;
import android.widget.TextView;

/**
 * A list view example where the data comes from a cursor.
 */
public class List7 extends ListActivity implements OnItemSelectedListener {

    private TextView mPhone;

    private static final String[] PHONE_PROJECTION = new String[] {
        Phone._ID,
        Phone.TYPE,
        Phone.LABEL,
        Phone.NUMBER,
        Phone.DISPLAY_NAME
    };

    private static final int COLUMN_PHONE_TYPE = 1;
    private static final int COLUMN_PHONE_LABEL = 2;
    private static final int COLUMN_PHONE_NUMBER = 3;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.list_7);
        mPhone = (TextView) findViewById(R.id.phone);
        getListView().setOnItemSelectedListener(this);

        // Get a cursor with all numbers.
        // This query will only return contacts with phone numbers
        Cursor c = getContentResolver().query(Phone.CONTENT_URI,
                PHONE_PROJECTION, Phone.NUMBER + " NOT NULL", null, null);
        startManagingCursor(c);

        ListAdapter adapter = new SimpleCursorAdapter(this,
                // Use a template that displays a text view
                android.R.layout.simple_list_item_1,
                // Give the cursor to the list adapter
                c,
                // Map the DISPLAY_NAME column to...
                new String[] {Phone.DISPLAY_NAME},
                // The "text1" view defined in the XML template
                new int[] {android.R.id.text1});
        setListAdapter(adapter);
    }

    public void onItemSelected(AdapterView<?> parent, View v, int position, long id) {
        if (position >= 0) {
            //Get current cursor
            Cursor c = (Cursor) parent.getItemAtPosition(position);
            int type = c.getInt(COLUMN_PHONE_TYPE);
            String phone = c.getString(COLUMN_PHONE_NUMBER);
            String label = null;
            //Custom type? Then get the custom label
            if (type == Phone.TYPE_CUSTOM) {
                label = c.getString(COLUMN_PHONE_LABEL);
            }
            //Get the readable string
            String numberType = (String) Phone.getTypeLabel(getResources(), type, label);
            String text = numberType + ": " + phone;
            mPhone.setText(text);
        }
    }

    public void onNothingSelected(AdapterView<?> parent) {
    }
}
