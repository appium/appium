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

package com.example.android.apis;

import android.test.ActivityInstrumentationTestCase2;

/**
 * Make sure that the main launcher activity opens up properly, which will be
 * verified by {@link #testActivityTestCaseSetUpProperly}.
 */
public class ApiDemosTest extends ActivityInstrumentationTestCase2<ApiDemos> {

    /**
     * Create an {@link ActivityInstrumentationTestCase2} that tests the {@link ApiDemos} activity.
     */
    public ApiDemosTest() {
        super(ApiDemos.class);
    }

    /**
     * Verifies that activity under test can be launched.
     */
    public void testActivityTestCaseSetUpProperly() {
        assertNotNull("activity should be launched successfully", getActivity());
    }
}
