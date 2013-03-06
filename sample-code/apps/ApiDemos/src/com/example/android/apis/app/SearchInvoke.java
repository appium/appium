/*
 * Copyright (C) 2008 The Android Open Source Project
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
import android.app.AlertDialog;
import android.app.SearchManager;
import android.os.Bundle;
import android.provider.SearchRecentSuggestions;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.AdapterView.OnItemSelectedListener;

public class SearchInvoke extends Activity
{  
        // UI elements
    Button mStartSearch;
    Spinner mMenuMode;
    EditText mQueryPrefill;
    EditText mQueryAppData;
    
        // Menu mode spinner choices
        // This list must match the list found in samples/ApiDemos/res/values/arrays.xml
    final static int MENUMODE_SEARCH_KEY = 0;
    final static int MENUMODE_MENU_ITEM = 1;
    final static int MENUMODE_TYPE_TO_SEARCH = 2;
    final static int MENUMODE_DISABLED = 3;
    
    /** 
     * Called with the activity is first created.
     * 
     *  We aren't doing anything special in this implementation, other than
     *  the usual activity setup code. 
     */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Inflate our UI from its XML layout description.
        setContentView(R.layout.search_invoke);
        
        // Get display items for later interaction
        mStartSearch = (Button) findViewById(R.id.btn_start_search);
        mMenuMode = (Spinner) findViewById(R.id.spinner_menu_mode);
        mQueryPrefill = (EditText) findViewById(R.id.txt_query_prefill);
        mQueryAppData = (EditText) findViewById(R.id.txt_query_appdata);
        
        // Populate items
        ArrayAdapter<CharSequence> adapter = ArrayAdapter.createFromResource(
                            this, R.array.search_menuModes, android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        mMenuMode.setAdapter(adapter);
        
        // Create listener for the menu mode dropdown.  We use this to demonstrate control
        // of the default keys handler in every Activity.  More typically, you will simply set
        // the default key mode in your activity's onCreate() handler.
        mMenuMode.setOnItemSelectedListener(
            new OnItemSelectedListener() {
                public void onItemSelected(
                        AdapterView<?> parent, View view, int position, long id) {
                    if (position == MENUMODE_TYPE_TO_SEARCH) {
                        setDefaultKeyMode(DEFAULT_KEYS_SEARCH_LOCAL);
                    } else {
                        setDefaultKeyMode(DEFAULT_KEYS_DISABLE);
                    }
                }

                public void onNothingSelected(AdapterView<?> parent) {
                    setDefaultKeyMode(DEFAULT_KEYS_DISABLE);
                }
            });
        
        // Attach actions to buttons
        mStartSearch.setOnClickListener(
            new OnClickListener() {
                public void onClick(View v) {
                    onSearchRequested();
                }
            });
    }
    
    /** 
     * Called when your activity's options menu needs to be updated. 
     */
    @Override
    public boolean onPrepareOptionsMenu(Menu menu) {
        super.onPrepareOptionsMenu(menu);
        MenuItem item;
        
            // first, get rid of our menus (if any)
        menu.removeItem(0);
        menu.removeItem(1);
        
            // next, add back item(s) based on current menu mode
        switch (mMenuMode.getSelectedItemPosition())
        {
        case MENUMODE_SEARCH_KEY:
            item = menu.add( 0, 0, 0, "(Search Key)");
            break;
            
        case MENUMODE_MENU_ITEM:
            item = menu.add( 0, 0, 0, "Search");
            item.setAlphabeticShortcut(SearchManager.MENU_KEY);
            break;
            
        case MENUMODE_TYPE_TO_SEARCH:
            item = menu.add( 0, 0, 0, "(Type-To-Search)");
            break;
            
        case MENUMODE_DISABLED:
            item = menu.add( 0, 0, 0, "(Disabled)");
            break;
        }
        
        item = menu.add(0, 1, 0, "Clear History");
        return true;
    }
    
    /** Handle the menu item selections */
    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
        case 0:
            switch (mMenuMode.getSelectedItemPosition()) {
            case MENUMODE_SEARCH_KEY:
                new AlertDialog.Builder(this)
                    .setMessage("To invoke search, dismiss this dialog and press the search key" +
                                " (F5 on the simulator).")
                    .setPositiveButton("OK", null)
                    .show();
                break;
                
            case MENUMODE_MENU_ITEM:
                onSearchRequested();
                break;
                
            case MENUMODE_TYPE_TO_SEARCH:
                new AlertDialog.Builder(this)
                    .setMessage("To invoke search, dismiss this dialog and start typing.")
                    .setPositiveButton("OK", null)
                    .show();
                break;
                
            case MENUMODE_DISABLED:
                new AlertDialog.Builder(this)
                    .setMessage("You have disabled search.")
                    .setPositiveButton("OK", null)
                    .show();
                break;
            }
            break;
        case 1:
            clearSearchHistory();
            break;
        }
    
         return super.onOptionsItemSelected(item);
    }
    
    /**
     * This hook is called when the user signals the desire to start a search.
     * 
     * By overriding this hook we can insert local or context-specific data.
     * 
     * @return Returns true if search launched, false if activity blocks it
     */
    @Override
    public boolean onSearchRequested() {
        // If your application absolutely must disable search, do it here.
        if (mMenuMode.getSelectedItemPosition() == MENUMODE_DISABLED) {
            return false;
        }
        
        // It's possible to prefill the query string before launching the search
        // UI.  For this demo, we simply copy it from the user input field.
        // For most applications, you can simply pass null to startSearch() to
        // open the UI with an empty query string.
        final String queryPrefill = mQueryPrefill.getText().toString();
        
        // Next, set up a bundle to send context-specific search data (if any)
        // The bundle can contain any number of elements, using any number of keys;
        // For this Api Demo we copy a string from the user input field, and store
        // it in the bundle as a string with the key "demo_key".
        // For most applications, you can simply pass null to startSearch().
        Bundle appDataBundle = null;
        final String queryAppDataString = mQueryAppData.getText().toString();
        if (queryAppDataString != null) {
            appDataBundle = new Bundle();
            appDataBundle.putString("demo_key", queryAppDataString);
        }
        
        // Now call the Activity member function that invokes the Search Manager UI.
        startSearch(queryPrefill, false, appDataBundle, false); 
        
        // Returning true indicates that we did launch the search, instead of blocking it.
        return true;
    }
    
    /**
     * Any application that implements search suggestions based on previous actions (such as
     * recent queries, page/items viewed, etc.) should provide a way for the user to clear the
     * history.  This gives the user a measure of privacy, if they do not wish for their recent
     * searches to be replayed by other users of the device (via suggestions).
     * 
     * This example shows how to clear the search history for apps that use 
     * android.provider.SearchRecentSuggestions.  If you have developed a custom suggestions
     * provider, you'll need to provide a similar API for clearing history.
     * 
     * In this sample app we call this method from a "Clear History" menu item.  You could also 
     * implement the UI in your preferences, or any other logical place in your UI.
     */
    private void clearSearchHistory() {
        SearchRecentSuggestions suggestions = new SearchRecentSuggestions(this, 
                SearchSuggestionSampleProvider.AUTHORITY, SearchSuggestionSampleProvider.MODE);
        suggestions.clearHistory();
    }
    
}
