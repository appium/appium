/*
 * Copyright (C) 2011 The Android Open Source Project
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

import android.app.ActionBar;
import android.app.ActionBar.Tab;
import android.app.Activity;
import android.app.FragmentTransaction;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.util.AttributeSet;
import android.util.Log;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.SearchView;
import android.widget.SeekBar;
import android.widget.ShareActionProvider;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.SearchView.OnQueryTextListener;

import com.example.android.apis.R;

/**
 * This activity demonstrates how to use system UI flags to implement
 * a video player style of UI (where the navigation bar should be hidden
 * when the user isn't interacting with the screen to achieve full screen
 * video playback).
 */
public class VideoPlayerActivity extends Activity
        implements OnQueryTextListener, ActionBar.TabListener {

    /**
     * Implementation of a view for displaying full-screen video playback,
     * using system UI flags to transition in and out of modes where the entire
     * screen can be filled with content (at the expense of no user interaction).
     */

    public static class Content extends ImageView implements
            View.OnSystemUiVisibilityChangeListener, View.OnClickListener,
            ActionBar.OnMenuVisibilityListener {
        Activity mActivity;
        TextView mTitleView;
        Button mPlayButton;
        SeekBar mSeekView;
        boolean mAddedMenuListener;
        boolean mMenusOpen;
        boolean mPaused;
        boolean mNavVisible;
        int mLastSystemUiVis;

        Runnable mNavHider = new Runnable() {
            @Override public void run() {
                setNavVisibility(false);
            }
        };

        public Content(Context context, AttributeSet attrs) {
            super(context, attrs);
            setOnSystemUiVisibilityChangeListener(this);
            setOnClickListener(this);
        }

        public void init(Activity activity, TextView title, Button playButton,
                SeekBar seek) {
            // This called by the containing activity to supply the surrounding
            // state of the video player that it will interact with.
            mActivity = activity;
            mTitleView = title;
            mPlayButton = playButton;
            mSeekView = seek;
            mPlayButton.setOnClickListener(this);
            setPlayPaused(true);
        }

        @Override protected void onAttachedToWindow() {
            super.onAttachedToWindow();
            if (mActivity != null) {
                mAddedMenuListener = true;
                mActivity.getActionBar().addOnMenuVisibilityListener(this);
            }
        }

        @Override protected void onDetachedFromWindow() {
            super.onDetachedFromWindow();
            if (mAddedMenuListener) {
                mActivity.getActionBar().removeOnMenuVisibilityListener(this);
            }
        }

        @Override public void onSystemUiVisibilityChange(int visibility) {
            // Detect when we go out of nav-hidden mode, to clear our state
            // back to having the full UI chrome up.  Only do this when
            // the state is changing and nav is no longer hidden.
            int diff = mLastSystemUiVis ^ visibility;
            mLastSystemUiVis = visibility;
            if ((diff&SYSTEM_UI_FLAG_HIDE_NAVIGATION) != 0
                    && (visibility&SYSTEM_UI_FLAG_HIDE_NAVIGATION) == 0) {
                setNavVisibility(true);
            }
        }

        @Override protected void onWindowVisibilityChanged(int visibility) {
            super.onWindowVisibilityChanged(visibility);

            // When we become visible or invisible, play is paused.
            setPlayPaused(true);
        }

        @Override public void onClick(View v) {
            if (v == mPlayButton) {
                // Clicking on the play/pause button toggles its state.
                setPlayPaused(!mPaused);
            } else {
                // Clicking elsewhere makes the navigation visible.
                setNavVisibility(true);
            }
        }

        @Override public void onMenuVisibilityChanged(boolean isVisible) {
            mMenusOpen = isVisible;
            setNavVisibility(true);
        }

        void setPlayPaused(boolean paused) {
            mPaused = paused;
            mPlayButton.setText(paused ? R.string.play : R.string.pause);
            setKeepScreenOn(!paused);
            setNavVisibility(true);
        }

        void setNavVisibility(boolean visible) {
            int newVis = SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | SYSTEM_UI_FLAG_LAYOUT_STABLE;
            if (!visible) {
                newVis |= SYSTEM_UI_FLAG_LOW_PROFILE | SYSTEM_UI_FLAG_FULLSCREEN
                        | SYSTEM_UI_FLAG_HIDE_NAVIGATION;
            }

            // If we are now visible, schedule a timer for us to go invisible.
            if (visible) {
                Handler h = getHandler();
                if (h != null) {
                    h.removeCallbacks(mNavHider);
                    if (!mMenusOpen && !mPaused) {
                        // If the menus are open or play is paused, we will not auto-hide.
                        h.postDelayed(mNavHider, 1500);
                    }
                }
            }

            // Set the new desired visibility.
            setSystemUiVisibility(newVis);
            mTitleView.setVisibility(visible ? VISIBLE : INVISIBLE);
            mPlayButton.setVisibility(visible ? VISIBLE : INVISIBLE);
            mSeekView.setVisibility(visible ? VISIBLE : INVISIBLE);
        }
    }


    Content mContent;

    public VideoPlayerActivity() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().requestFeature(Window.FEATURE_ACTION_BAR_OVERLAY);

        setContentView(R.layout.video_player);
        mContent = (Content)findViewById(R.id.content);
        mContent.init(this, (TextView)findViewById(R.id.title),
                (Button)findViewById(R.id.play),
                (SeekBar)findViewById(R.id.seekbar));

        ActionBar bar = getActionBar();
        bar.addTab(bar.newTab().setText("Tab 1").setTabListener(this));
        bar.addTab(bar.newTab().setText("Tab 2").setTabListener(this));
        bar.addTab(bar.newTab().setText("Tab 3").setTabListener(this));
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.content_actions, menu);
        SearchView searchView = (SearchView) menu.findItem(R.id.action_search).getActionView();
        searchView.setOnQueryTextListener(this);

        // Set file with share history to the provider and set the share intent.
        MenuItem actionItem = menu.findItem(R.id.menu_item_share_action_provider_action_bar);
        ShareActionProvider actionProvider = (ShareActionProvider) actionItem.getActionProvider();
        actionProvider.setShareHistoryFileName(ShareActionProvider.DEFAULT_SHARE_HISTORY_FILE_NAME);
        // Note that you can set/change the intent any time,
        // say when the user has selected an image.
        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("image/*");
        Uri uri = Uri.fromFile(getFileStreamPath("shared.png"));
        shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
        actionProvider.setShareIntent(shareIntent);
        return true;
    }

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
    }

    @Override
    protected void onResume() {
        super.onResume();
    }

    /**
     * This method is declared in the menu.
     */
    public void onSort(MenuItem item) {
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.show_tabs:
                getActionBar().setNavigationMode(ActionBar.NAVIGATION_MODE_TABS);
                item.setChecked(true);
                return true;
            case R.id.hide_tabs:
                getActionBar().setNavigationMode(ActionBar.NAVIGATION_MODE_STANDARD);
                item.setChecked(true);
                return true;
        }
        return false;
    }

    @Override
    public boolean onQueryTextChange(String newText) {
        return true;
    }

    @Override
    public boolean onQueryTextSubmit(String query) {
        Toast.makeText(this, "Searching for: " + query + "...", Toast.LENGTH_SHORT).show();
        return true;
    }

    @Override
    public void onTabSelected(Tab tab, FragmentTransaction ft) {
    }

    @Override
    public void onTabUnselected(Tab tab, FragmentTransaction ft) {
    }

    @Override
    public void onTabReselected(Tab tab, FragmentTransaction ft) {
    }
}
