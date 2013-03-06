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

package com.example.android.apis.os;

import junit.framework.TestCase;
import android.test.suitebuilder.annotation.SmallTest;

/**
 * An example of a true unit test that tests the utility class {@link MorseCodeConverter}.
 * Since this test doesn't need a {@link android.content.Context}, or any other
 * dependencies injected, it simply extends the standard {@link TestCase}.
 *
 * See {@link com.example.android.apis.AllTests} for documentation on running
 * all tests and individual tests in this application.
 */
public class MorseCodeConverterTest extends TestCase {

    @SmallTest
    public void testCharacterS() throws Exception {

        long[] expectedBeeps = {
                MorseCodeConverter.DOT,
                MorseCodeConverter.DOT,
                MorseCodeConverter.DOT,
                MorseCodeConverter.DOT,
                MorseCodeConverter.DOT};
        long[] beeps = MorseCodeConverter.pattern('s');

        assertArraysEqual(expectedBeeps, beeps);
    }

    private void assertArraysEqual(long[] expected, long[] actual) {
        assertEquals("Unexpected array length.", expected.length, actual.length);
        for (int i = 0; i < expected.length; i++) {
            long expectedLong = expected[i];
            long actualLong = actual[i];
            assertEquals("Unexpected long at index: " + i, expectedLong, actualLong);
        }
    }
}
