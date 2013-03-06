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
package com.example.android.apis.app;

import com.example.android.apis.R;

import android.app.ActionBar;
import android.app.ActionBar.Tab;
import android.app.Activity;
import android.app.Fragment;
import android.app.FragmentTransaction;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

/**
 * This demonstrates the use of action bar tabs and how they interact
 * with other action bar features.
 */
public class ActionBarTabs extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.action_bar_tabs);
    }

    public void onAddTab(View v) {
        final ActionBar bar = getActionBar();
        final int tabCount = bar.getTabCount();
        final String text = "Tab " + tabCount;
        bar.addTab(bar.newTab()
                .setText(text)
                .setTabListener(new TabListener(new TabContentFragment(text))));
    }

    public void onRemoveTab(View v) {
        final ActionBar bar = getActionBar();
        if (bar.getTabCount() > 0) {
            bar.removeTabAt(bar.getTabCount() - 1);
        }
    }

    public void onToggleTabs(View v) {
        final ActionBar bar = getActionBar();

        if (bar.getNavigationMode() == ActionBar.NAVIGATION_MODE_TABS) {
            bar.setNavigationMode(ActionBar.NAVIGATION_MODE_STANDARD);
            bar.setDisplayOptions(ActionBar.DISPLAY_SHOW_TITLE, ActionBar.DISPLAY_SHOW_TITLE);
        } else {
            bar.setNavigationMode(ActionBar.NAVIGATION_MODE_TABS);
            bar.setDisplayOptions(0, ActionBar.DISPLAY_SHOW_TITLE);
        }
    }

    public void onRemoveAllTabs(View v) {
        getActionBar().removeAllTabs();
    }

    /**
     * A TabListener receives event callbacks from the action bar as tabs
     * are deselected, selected, and reselected. A FragmentTransaction
     * is provided to each of these callbacks; if any operations are added
     * to it, it will be committed at the end of the full tab switch operation.
     * This lets tab switches be atomic without the app needing to track
     * the interactions between different tabs.
     *
     * NOTE: This is a very simple implementation that does not retain
     * fragment state of the non-visible tabs across activity instances.
     * Look at the FragmentTabs example for how to do a more complete
     * implementation.
     */
    private class TabListener implements ActionBar.TabListener {
        private TabContentFragment mFragment;

        public TabListener(TabContentFragment fragment) {
            mFragment = fragment;
        }

        public void onTabSelected(Tab tab, FragmentTransaction ft) {
            ft.add(R.id.fragment_content, mFragment, mFragment.getText());
        }

        public void onTabUnselected(Tab tab, FragmentTransaction ft) {
            ft.remove(mFragment);
        }

        public void onTabReselected(Tab tab, FragmentTransaction ft) {
            Toast.makeText(ActionBarTabs.this, "Reselected!", Toast.LENGTH_SHORT).show();
        }

    }

    private class TabContentFragment extends Fragment {
        private String mText;

        public TabContentFragment(String text) {
            mText = text;
        }

        public String getText() {
            return mText;
        }

        @Override
        public View onCreateView(LayoutInflater inflater, ViewGroup container,
                Bundle savedInstanceState) {
            View fragView = inflater.inflate(R.layout.action_bar_tab_content, container, false);

            TextView text = (TextView) fragView.findViewById(R.id.text);
            text.setText(mText);

            return fragView;
        }

    }
}
