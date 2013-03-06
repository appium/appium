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

import android.app.ListActivity;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.widget.BaseAdapter;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.AbsListView;

import java.util.ArrayList;


/**
 * A list view that demonstrates the use of setEmptyView. This example alos uses
 * a custom layout file that adds some extra buttons to the screen.
 */
public class List8 extends ListActivity {

    PhotoAdapter mAdapter;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Use a custom layout file
        setContentView(R.layout.list_8);
        
        // Tell the list view which view to display when the list is empty
        getListView().setEmptyView(findViewById(R.id.empty));
        
        // Set up our adapter
        mAdapter = new PhotoAdapter(this);
        setListAdapter(mAdapter);
        
        // Wire up the clear button to remove all photos
        Button clear = (Button) findViewById(R.id.clear);
        clear.setOnClickListener(new View.OnClickListener() {

            public void onClick(View v) {
                mAdapter.clearPhotos();
            } });
        
        // Wire up the add button to add a new photo
        Button add = (Button) findViewById(R.id.add);
        add.setOnClickListener(new View.OnClickListener() {

            public void onClick(View v) {
                mAdapter.addPhotos();
            } });
    }

    /**
     * A simple adapter which maintains an ArrayList of photo resource Ids. 
     * Each photo is displayed as an image. This adapter supports clearing the
     * list of photos and adding a new photo.
     *
     */
    public class PhotoAdapter extends BaseAdapter {

        private Integer[] mPhotoPool = {
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1, R.drawable.sample_thumb_2,
                R.drawable.sample_thumb_3, R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7};

        private ArrayList<Integer> mPhotos = new ArrayList<Integer>();
        
        public PhotoAdapter(Context c) {
            mContext = c;
        }

        public int getCount() {
            return mPhotos.size();
        }

        public Object getItem(int position) {
            return position;
        }

        public long getItemId(int position) {
            return position;
        }

        public View getView(int position, View convertView, ViewGroup parent) {
            // Make an ImageView to show a photo
            ImageView i = new ImageView(mContext);

            i.setImageResource(mPhotos.get(position));
            i.setAdjustViewBounds(true);
            i.setLayoutParams(new AbsListView.LayoutParams(LayoutParams.WRAP_CONTENT,
                    LayoutParams.WRAP_CONTENT));
            // Give it a nice background
            i.setBackgroundResource(R.drawable.picture_frame);
            return i;
        }

        private Context mContext;

        public void clearPhotos() {
            mPhotos.clear();
            notifyDataSetChanged();
        }
        
        public void addPhotos() {
            int whichPhoto = (int)Math.round(Math.random() * (mPhotoPool.length - 1));
            int newPhoto = mPhotoPool[whichPhoto];
            mPhotos.add(newPhoto);
            notifyDataSetChanged();
        }

    }
}
