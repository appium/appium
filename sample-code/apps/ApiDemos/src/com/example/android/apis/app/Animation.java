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

package com.example.android.apis.app;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

import android.app.Activity;
import android.app.ActivityOptions;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Bundle;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;


/**
 * <p>Example of using a custom animation when transitioning between activities.</p>
 */
public class Animation extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_animation);

        // Watch for button clicks.
        Button button = (Button)findViewById(R.id.fade_animation);
        button.setOnClickListener(mFadeListener);
        button = (Button)findViewById(R.id.zoom_animation);
        button.setOnClickListener(mZoomListener);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
            button = (Button)findViewById(R.id.modern_fade_animation);
            button.setOnClickListener(mModernFadeListener);
            button = (Button)findViewById(R.id.modern_zoom_animation);
            button.setOnClickListener(mModernZoomListener);
            button = (Button)findViewById(R.id.scale_up_animation);
            button.setOnClickListener(mScaleUpListener);
            button = (Button)findViewById(R.id.zoom_thumbnail_animation);
            button.setOnClickListener(mZoomThumbnailListener);
        } else {
            findViewById(R.id.modern_fade_animation).setEnabled(false);
            findViewById(R.id.modern_zoom_animation).setEnabled(false);
            findViewById(R.id.scale_up_animation).setEnabled(false);
            findViewById(R.id.zoom_thumbnail_animation).setEnabled(false);
        }
    }

    private OnClickListener mFadeListener = new OnClickListener() {
        public void onClick(View v) {
            // Request the next activity transition (here starting a new one).
            startActivity(new Intent(Animation.this, AlertDialogSamples.class));
            // Supply a custom animation.  This one will just fade the new
            // activity on top.  Note that we need to also supply an animation
            // (here just doing nothing for the same amount of time) for the
            // old activity to prevent it from going away too soon.
            overridePendingTransition(R.anim.fade, R.anim.hold);
        }
    };

    private OnClickListener mZoomListener = new OnClickListener() {
        public void onClick(View v) {
            // Request the next activity transition (here starting a new one).
            startActivity(new Intent(Animation.this, AlertDialogSamples.class));
            // This is a more complicated animation, involving transformations
            // on both this (exit) and the new (enter) activity.  Note how for
            // the duration of the animation we force the exiting activity
            // to be Z-ordered on top (even though it really isn't) to achieve
            // the effect we want.
            overridePendingTransition(R.anim.zoom_enter, R.anim.zoom_exit);
        }
    };

    private OnClickListener mModernFadeListener = new OnClickListener() {
        public void onClick(View v) {
            // Create the desired custom animation, involving transformations
            // on both this (exit) and the new (enter) activity.  Note how for
            // the duration of the animation we force the exiting activity
            // to be Z-ordered on top (even though it really isn't) to achieve
            // the effect we want.
            ActivityOptions opts = ActivityOptions.makeCustomAnimation(Animation.this,
                    R.anim.fade, R.anim.hold);
            // Request the activity be started, using the custom animation options.
            startActivity(new Intent(Animation.this, AlertDialogSamples.class), opts.toBundle());
        }
    };

    private OnClickListener mModernZoomListener = new OnClickListener() {
        public void onClick(View v) {
            // Create a more complicated animation, involving transformations
            // on both this (exit) and the new (enter) activity.  Note how for
            // the duration of the animation we force the exiting activity
            // to be Z-ordered on top (even though it really isn't) to achieve
            // the effect we want.
            ActivityOptions opts = ActivityOptions.makeCustomAnimation(Animation.this,
                    R.anim.zoom_enter, R.anim.zoom_enter);
            // Request the activity be started, using the custom animation options.
            startActivity(new Intent(Animation.this, AlertDialogSamples.class), opts.toBundle());
        }
    };

    private OnClickListener mScaleUpListener = new OnClickListener() {
        public void onClick(View v) {
            // Create a scale-up animation that originates at the button
            // being pressed.
            ActivityOptions opts = ActivityOptions.makeScaleUpAnimation(
                    v, 0, 0, v.getWidth(), v.getHeight());
            // Request the activity be started, using the custom animation options.
            startActivity(new Intent(Animation.this, AlertDialogSamples.class), opts.toBundle());
        }
    };

    private OnClickListener mZoomThumbnailListener = new OnClickListener() {
        public void onClick(View v) {
            // Create a thumbnail animation.  We are going to build our thumbnail
            // just from the view that was pressed.  We make sure the view is
            // not selected, because by the time the animation starts we will
            // have finished with the selection of the tap.
            v.setDrawingCacheEnabled(true);
            v.setPressed(false);
            v.refreshDrawableState();
            Bitmap bm = v.getDrawingCache();
            Canvas c = new Canvas(bm);
            //c.drawARGB(255, 255, 0, 0);
            ActivityOptions opts = ActivityOptions.makeThumbnailScaleUpAnimation(
                    v, bm, 0, 0);
            // Request the activity be started, using the custom animation options.
            startActivity(new Intent(Animation.this, AlertDialogSamples.class), opts.toBundle());
            v.setDrawingCacheEnabled(false);
        }
    };
}

