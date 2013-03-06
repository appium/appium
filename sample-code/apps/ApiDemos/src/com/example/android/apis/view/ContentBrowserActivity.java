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
import android.util.TypedValue;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.ScrollView;
import android.widget.SearchView;
import android.widget.SeekBar;
import android.widget.ShareActionProvider;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.SearchView.OnQueryTextListener;

import com.example.android.apis.R;

/**
 * This activity demonstrates how to use system UI flags to implement
 * a content browser style of UI (such as a book reader).
 */
public class ContentBrowserActivity extends Activity
        implements OnQueryTextListener, ActionBar.TabListener {

    /**
     * Implementation of a view for displaying immersive content, using system UI
     * flags to transition in and out of modes where the user is focused on that
     * content.
     */

    public static class Content extends ScrollView
            implements View.OnSystemUiVisibilityChangeListener, View.OnClickListener {
        TextView mText;
        TextView mTitleView;
        SeekBar mSeekView;
        boolean mNavVisible;
        int mBaseSystemUiVisibility = SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | SYSTEM_UI_FLAG_LAYOUT_STABLE;
        int mLastSystemUiVis;

        Runnable mNavHider = new Runnable() {
            @Override public void run() {
                setNavVisibility(false);
            }
        };

        public Content(Context context, AttributeSet attrs) {
            super(context, attrs);
    
            mText = new TextView(context);
            mText.setTextSize(TypedValue.COMPLEX_UNIT_DIP, 16);
            mText.setText(context.getString(R.string.alert_dialog_two_buttons2ultra_msg));
            mText.setClickable(false);
            mText.setOnClickListener(this);
            mText.setTextIsSelectable(true);
            addView(mText, new ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

            setOnSystemUiVisibilityChangeListener(this);
        }

        public void init(TextView title, SeekBar seek) {
            // This called by the containing activity to supply the surrounding
            // state of the content browser that it will interact with.
            mTitleView = title;
            mSeekView = seek;
            setNavVisibility(true);
        }

        @Override public void onSystemUiVisibilityChange(int visibility) {
            // Detect when we go out of low-profile mode, to also go out
            // of full screen.  We only do this when the low profile mode
            // is changing from its last state, and turning off.
            int diff = mLastSystemUiVis ^ visibility;
            mLastSystemUiVis = visibility;
            if ((diff&SYSTEM_UI_FLAG_LOW_PROFILE) != 0
                    && (visibility&SYSTEM_UI_FLAG_LOW_PROFILE) == 0) {
                setNavVisibility(true);
            }
        }

        @Override protected void onWindowVisibilityChanged(int visibility) {
            super.onWindowVisibilityChanged(visibility);

            // When we become visible, we show our navigation elements briefly
            // before hiding them.
            setNavVisibility(true);
            getHandler().postDelayed(mNavHider, 2000);
        }

        @Override protected void onScrollChanged(int l, int t, int oldl, int oldt) {
            super.onScrollChanged(l, t, oldl, oldt);

            // When the user scrolls, we hide navigation elements.
            setNavVisibility(false);
        }

        @Override public void onClick(View v) {
            // When the user clicks, we toggle the visibility of navigation elements.
            int curVis = getSystemUiVisibility();
            setNavVisibility((curVis&SYSTEM_UI_FLAG_LOW_PROFILE) != 0);
        }

        void setBaseSystemUiVisibility(int visibility) {
            mBaseSystemUiVisibility = visibility;
        }

        void setNavVisibility(boolean visible) {
            int newVis = mBaseSystemUiVisibility;
            if (!visible) {
                newVis |= SYSTEM_UI_FLAG_LOW_PROFILE | SYSTEM_UI_FLAG_FULLSCREEN;
            }
            final boolean changed = newVis == getSystemUiVisibility();

            // Unschedule any pending event to hide navigation if we are
            // changing the visibility, or making the UI visible.
            if (changed || visible) {
                Handler h = getHandler();
                if (h != null) {
                    h.removeCallbacks(mNavHider);
                }
            }

            // Set the new desired visibility.
            setSystemUiVisibility(newVis);
            mTitleView.setVisibility(visible ? VISIBLE : INVISIBLE);
            mSeekView.setVisibility(visible ? VISIBLE : INVISIBLE);
        }
    }


    Content mContent;

    public ContentBrowserActivity() {
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().requestFeature(Window.FEATURE_ACTION_BAR_OVERLAY);

        setContentView(R.layout.content_browser);
        mContent = (Content)findViewById(R.id.content);
        mContent.init((TextView)findViewById(R.id.title),
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
            case R.id.stable_layout:
                item.setChecked(!item.isChecked());
                mContent.setBaseSystemUiVisibility(item.isChecked()
                        ? View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        : View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
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
