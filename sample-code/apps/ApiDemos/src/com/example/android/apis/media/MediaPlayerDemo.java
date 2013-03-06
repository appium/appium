/*
 * Copyright (C) 2009 The Android Open Source Project
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

package com.example.android.apis.media;

import com.example.android.apis.R;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;

public class MediaPlayerDemo extends Activity {
    private Button mlocalvideo;
    private Button mresourcesvideo;
    private Button mstreamvideo;
    private Button mlocalaudio;
    private Button mresourcesaudio;
    private Button mstreamaudio;
    private static final String MEDIA = "media";
    private static final int LOCAL_AUDIO = 1;
    private static final int STREAM_AUDIO = 2;
    private static final int RESOURCES_AUDIO = 3;
    private static final int LOCAL_VIDEO = 4;
    private static final int STREAM_VIDEO = 5;
    private static final int RESOURCES_VIDEO = 6;

    @Override
    protected void onCreate(Bundle icicle) {
        // TODO Auto-generated method stub
        super.onCreate(icicle);
        setContentView(R.layout.mediaplayer_1);
        mlocalaudio = (Button) findViewById(R.id.localaudio);
        mlocalaudio.setOnClickListener(mLocalAudioListener);
        mresourcesaudio = (Button) findViewById(R.id.resourcesaudio);
        mresourcesaudio.setOnClickListener(mResourcesAudioListener);

        mlocalvideo = (Button) findViewById(R.id.localvideo);
        mlocalvideo.setOnClickListener(mLocalVideoListener);
        mstreamvideo = (Button) findViewById(R.id.streamvideo);
        mstreamvideo.setOnClickListener(mStreamVideoListener);
    }

    private OnClickListener mLocalAudioListener = new OnClickListener() {
        public void onClick(View v) {
            Intent intent =
                    new Intent(MediaPlayerDemo.this.getApplication(),
                            MediaPlayerDemo_Audio.class);
            intent.putExtra(MEDIA, LOCAL_AUDIO);
            startActivity(intent);

        }
    };
    private OnClickListener mResourcesAudioListener = new OnClickListener() {
        public void onClick(View v) {
            Intent intent =
                    new Intent(MediaPlayerDemo.this.getApplication(),
                            MediaPlayerDemo_Audio.class);
            intent.putExtra(MEDIA, RESOURCES_AUDIO);
            startActivity(intent);

        }
    };

    private OnClickListener mLocalVideoListener = new OnClickListener() {
        public void onClick(View v) {
            Intent intent =
                    new Intent(MediaPlayerDemo.this,
                            MediaPlayerDemo_Video.class);
            intent.putExtra(MEDIA, LOCAL_VIDEO);
            startActivity(intent);

        }
    };
    private OnClickListener mStreamVideoListener = new OnClickListener() {
        public void onClick(View v) {
            Intent intent =
                    new Intent(MediaPlayerDemo.this,
                            MediaPlayerDemo_Video.class);
            intent.putExtra(MEDIA, STREAM_VIDEO);
            startActivity(intent);

        }
    };



}
