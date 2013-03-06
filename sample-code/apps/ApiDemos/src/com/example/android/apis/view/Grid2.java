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
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;
import android.widget.GridView;
import android.widget.ImageView;

/**
 * A grid that displays a set of framed photos.
 *
 */
public class Grid2 extends Activity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.grid_2);

        GridView g = (GridView) findViewById(R.id.myGrid);
        g.setAdapter(new ImageAdapter(this));
    }

    public class ImageAdapter extends BaseAdapter {
        public ImageAdapter(Context c) {
            mContext = c;
        }

        public int getCount() {
            return mThumbIds.length;
        }

        public Object getItem(int position) {
            return position;
        }

        public long getItemId(int position) {
            return position;
        }

        public View getView(int position, View convertView, ViewGroup parent) {
            ImageView imageView;
            if (convertView == null) {
                imageView = new ImageView(mContext);
                imageView.setLayoutParams(new GridView.LayoutParams(45, 45));
                imageView.setAdjustViewBounds(false);
                imageView.setScaleType(ImageView.ScaleType.CENTER_CROP);
                imageView.setPadding(8, 8, 8, 8);
            } else {
                imageView = (ImageView) convertView;
            }

            imageView.setImageResource(mThumbIds[position]);

            return imageView;
        }

        private Context mContext;

        private Integer[] mThumbIds = {
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
                R.drawable.sample_thumb_0, R.drawable.sample_thumb_1,
                R.drawable.sample_thumb_2, R.drawable.sample_thumb_3,
                R.drawable.sample_thumb_4, R.drawable.sample_thumb_5,
                R.drawable.sample_thumb_6, R.drawable.sample_thumb_7,
        };
    }

}
