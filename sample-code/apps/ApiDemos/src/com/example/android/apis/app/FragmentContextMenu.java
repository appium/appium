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
import android.os.Bundle;
import android.util.Log;
import android.view.ContextMenu;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.ContextMenu.ContextMenuInfo;
import android.widget.Toast;

/**
 * Demonstration of displaying a context menu from a fragment.
 */
public class FragmentContextMenu extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create the list fragment and add it as our sole content.
        ContextMenuFragment content = new ContextMenuFragment();
        getFragmentManager().beginTransaction().add(android.R.id.content, content).commit();
    }

    public static class ContextMenuFragment extends Fragment {

        @Override
        public View onCreateView(LayoutInflater inflater, ViewGroup container,
                Bundle savedInstanceState) {
            View root = inflater.inflate(R.layout.fragment_context_menu, container, false);
            registerForContextMenu(root.findViewById(R.id.long_press));
            return root;
        }

        @Override
        public void onCreateContextMenu(ContextMenu menu, View v, ContextMenuInfo menuInfo) {
            super.onCreateContextMenu(menu, v, menuInfo);
            menu.add(Menu.NONE, R.id.a_item, Menu.NONE, "Menu A");
            menu.add(Menu.NONE, R.id.b_item, Menu.NONE, "Menu B");
        }

        @Override
        public boolean onContextItemSelected(MenuItem item) {
            switch (item.getItemId()) {
                case R.id.a_item:
                    Toast.makeText(getActivity(), "Item 1a was chosen", Toast.LENGTH_SHORT).show();
                    return true;
                case R.id.b_item:
                    Toast.makeText(getActivity(), "Item 1b was chosen", Toast.LENGTH_SHORT).show();
                    return true;
            }
            return super.onContextItemSelected(item);
        }
    }
}
