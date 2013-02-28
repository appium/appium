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

import android.app.ExpandableListActivity;
import android.content.AsyncQueryHandler;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.ContactsContract.CommonDataKinds.Phone;
import android.provider.ContactsContract.Contacts;
import android.widget.CursorTreeAdapter;
import android.widget.SimpleCursorTreeAdapter;

/**
 * Demonstrates expandable lists backed by Cursors
 */
public class ExpandableList2 extends ExpandableListActivity {

    private static final String[] CONTACTS_PROJECTION = new String[] {
        Contacts._ID,
        Contacts.DISPLAY_NAME
    };
    private static final int GROUP_ID_COLUMN_INDEX = 0;

    private static final String[] PHONE_NUMBER_PROJECTION = new String[] {
            Phone._ID,
            Phone.NUMBER
    };

    private static final int TOKEN_GROUP = 0;
    private static final int TOKEN_CHILD = 1;

    private static final class QueryHandler extends AsyncQueryHandler {
        private CursorTreeAdapter mAdapter;

        public QueryHandler(Context context, CursorTreeAdapter adapter) {
            super(context.getContentResolver());
            this.mAdapter = adapter;
        }

        @Override
        protected void onQueryComplete(int token, Object cookie, Cursor cursor) {
            switch (token) {
            case TOKEN_GROUP:
                mAdapter.setGroupCursor(cursor);
                break;

            case TOKEN_CHILD:
                int groupPosition = (Integer) cookie;
                mAdapter.setChildrenCursor(groupPosition, cursor);
                break;
            }
        }
    }

    public class MyExpandableListAdapter extends SimpleCursorTreeAdapter {

        // Note that the constructor does not take a Cursor. This is done to avoid querying the 
        // database on the main thread.
        public MyExpandableListAdapter(Context context, int groupLayout,
                int childLayout, String[] groupFrom, int[] groupTo, String[] childrenFrom,
                int[] childrenTo) {

            super(context, null, groupLayout, groupFrom, groupTo, childLayout, childrenFrom,
                    childrenTo);
        }

        @Override
        protected Cursor getChildrenCursor(Cursor groupCursor) {
            // Given the group, we return a cursor for all the children within that group 

            // Return a cursor that points to this contact's phone numbers
            Uri.Builder builder = Contacts.CONTENT_URI.buildUpon();
            ContentUris.appendId(builder, groupCursor.getLong(GROUP_ID_COLUMN_INDEX));
            builder.appendEncodedPath(Contacts.Data.CONTENT_DIRECTORY);
            Uri phoneNumbersUri = builder.build();

            mQueryHandler.startQuery(TOKEN_CHILD, groupCursor.getPosition(), phoneNumbersUri, 
                    PHONE_NUMBER_PROJECTION, Phone.MIMETYPE + "=?", 
                    new String[] { Phone.CONTENT_ITEM_TYPE }, null);

            return null;
        }
    }

    private QueryHandler mQueryHandler;
    private CursorTreeAdapter mAdapter;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Set up our adapter
        mAdapter = new MyExpandableListAdapter(
                this,
                android.R.layout.simple_expandable_list_item_1,
                android.R.layout.simple_expandable_list_item_1,
                new String[] { Contacts.DISPLAY_NAME }, // Name for group layouts
                new int[] { android.R.id.text1 },
                new String[] { Phone.NUMBER }, // Number for child layouts
                new int[] { android.R.id.text1 });

        setListAdapter(mAdapter);

        mQueryHandler = new QueryHandler(this, mAdapter);

        // Query for people
        mQueryHandler.startQuery(TOKEN_GROUP, null, Contacts.CONTENT_URI, CONTACTS_PROJECTION, 
                Contacts.HAS_PHONE_NUMBER + "=1", null, null);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        // Null out the group cursor. This will cause the group cursor and all of the child cursors
        // to be closed.
        mAdapter.changeCursor(null);
        mAdapter = null;
    }
}
