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

import com.example.android.apis.R;

import android.app.Activity;
import android.content.ContentResolver;
import android.database.Cursor;
import android.os.Bundle;
import android.provider.ContactsContract.Contacts;
import android.widget.AutoCompleteTextView;

public class AutoComplete5 extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.autocomplete_5);

        ContentResolver content = getContentResolver();
        Cursor cursor = content.query(Contacts.CONTENT_URI,
                AutoComplete4.CONTACT_PROJECTION, null, null, null);
        AutoComplete4.ContactListAdapter adapter =
                new AutoComplete4.ContactListAdapter(this, cursor);

        AutoCompleteTextView textView = (AutoCompleteTextView)
                findViewById(R.id.edit);
        textView.setAdapter(adapter);
    }
}