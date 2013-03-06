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

import android.app.Activity;
import android.app.Fragment;
import android.app.FragmentManager;
import android.app.FragmentTransaction;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.CheckBox;

/**
 * Demonstrates how fragments can participate in the options menu.
 */
public class FragmentMenu extends Activity {
    Fragment mFragment1;
    Fragment mFragment2;
    CheckBox mCheckBox1;
    CheckBox mCheckBox2;

    // Update fragment visibility when check boxes are changed.
    final OnClickListener mClickListener = new OnClickListener() {
        public void onClick(View v) {
            updateFragmentVisibility();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.fragment_menu);
        
        // Make sure the two menu fragments are created.
        FragmentManager fm = getFragmentManager();
        FragmentTransaction ft = fm.beginTransaction();
        mFragment1 = fm.findFragmentByTag("f1");
        if (mFragment1 == null) {
            mFragment1 = new MenuFragment();
            ft.add(mFragment1, "f1");
        }
        mFragment2 = fm.findFragmentByTag("f2");
        if (mFragment2 == null) {
            mFragment2 = new Menu2Fragment();
            ft.add(mFragment2, "f2");
        }
        ft.commit();
        
        // Watch check box clicks.
        mCheckBox1 = (CheckBox)findViewById(R.id.menu1);
        mCheckBox1.setOnClickListener(mClickListener);
        mCheckBox2 = (CheckBox)findViewById(R.id.menu2);
        mCheckBox2.setOnClickListener(mClickListener);
        
        // Make sure fragments start out with correct visibility.
        updateFragmentVisibility();
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        // Make sure fragments are updated after check box view state is restored.
        updateFragmentVisibility();
    }

    // Update fragment visibility based on current check box state.
    void updateFragmentVisibility() {
        FragmentTransaction ft = getFragmentManager().beginTransaction();
        if (mCheckBox1.isChecked()) ft.show(mFragment1);
        else ft.hide(mFragment1);
        if (mCheckBox2.isChecked()) ft.show(mFragment2);
        else ft.hide(mFragment2);
        ft.commit();
    }

    /**
     * A fragment that displays a menu.  This fragment happens to not
     * have a UI (it does not implement onCreateView), but it could also
     * have one if it wanted.
     */
    public static class MenuFragment extends Fragment {

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            setHasOptionsMenu(true);
        }

        @Override
        public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
            menu.add("Menu 1a").setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
            menu.add("Menu 1b").setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
        }
    }

    /**
     * Second fragment with a menu.
     */
    public static class Menu2Fragment extends Fragment {

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            setHasOptionsMenu(true);
        }

        @Override
        public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
            menu.add("Menu 2").setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
        }
    }
}
