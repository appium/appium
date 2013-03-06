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

import android.content.SearchRecentSuggestionsProvider;

/**
 * To create a search suggestions provider using the built-in recent queries mode, 
 * simply extend SearchRecentSuggestionsProvider as shown here, and configure with
 * a unique authority and the mode you with to use.  For more information, see
 * {@link android.content.SearchRecentSuggestionsProvider}.
 */
public class SearchSuggestionSampleProvider extends SearchRecentSuggestionsProvider {
    
    /**
     * This is the provider authority identifier.  The same string must appear in your
     * Manifest file, and any time you instantiate a 
     * {@link android.provider.SearchRecentSuggestions} helper class. 
     */
    final static String AUTHORITY = "com.example.android.apis.SuggestionProvider";
    /**
     * These flags determine the operating mode of the suggestions provider.  This value should 
     * not change from run to run, because when it does change, your suggestions database may 
     * be wiped.
     */
    final static int MODE = DATABASE_MODE_QUERIES;
    
    /**
     * The main job of the constructor is to call {@link #setupSuggestions(String, int)} with the
     * appropriate configuration values.
     */
    public SearchSuggestionSampleProvider() {
        super();
        setupSuggestions(AUTHORITY, MODE);
    }
}
