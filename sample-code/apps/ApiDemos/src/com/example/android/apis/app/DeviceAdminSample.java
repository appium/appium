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

import android.app.ActivityManager;
import android.app.AlertDialog;
import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.EditTextPreference;
import android.preference.ListPreference;
import android.preference.Preference;
import android.preference.Preference.OnPreferenceChangeListener;
import android.preference.Preference.OnPreferenceClickListener;
import android.preference.PreferenceActivity;
import android.preference.PreferenceCategory;
import android.preference.PreferenceFragment;
import android.preference.PreferenceScreen;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Toast;

import java.util.List;

/**
 * This activity provides a comprehensive UI for exploring and operating the DevicePolicyManager
 * api.  It consists of two primary modules:
 *
 * 1:  A device policy controller, implemented here as a series of preference fragments.  Each
 *     one contains code to monitor and control a particular subset of device policies.
 *
 * 2:  A DeviceAdminReceiver, to receive updates from the DevicePolicyManager when certain aspects
 *     of the device security status have changed.
 */
public class DeviceAdminSample extends PreferenceActivity {

    // Miscellaneous utilities and definitions
    private static final String TAG = "DeviceAdminSample";

    private static final int REQUEST_CODE_ENABLE_ADMIN = 1;
    private static final int REQUEST_CODE_START_ENCRYPTION = 2;

    private static final long MS_PER_MINUTE = 60 * 1000;
    private static final long MS_PER_HOUR = 60 * MS_PER_MINUTE;
    private static final long MS_PER_DAY = 24 * MS_PER_HOUR;

    // The following keys are used to find each preference item
    private static final String KEY_ENABLE_ADMIN = "key_enable_admin";
    private static final String KEY_DISABLE_CAMERA = "key_disable_camera";
    private static final String KEY_DISABLE_KEYGUARD_WIDGETS = "key_disable_keyguard_widgets";
    private static final String KEY_DISABLE_KEYGUARD_SECURE_CAMERA
            = "key_disable_keyguard_secure_camera";

    private static final String KEY_CATEGORY_QUALITY = "key_category_quality";
    private static final String KEY_SET_PASSWORD = "key_set_password";
    private static final String KEY_RESET_PASSWORD = "key_reset_password";
    private static final String KEY_QUALITY = "key_quality";
    private static final String KEY_MIN_LENGTH = "key_minimum_length";
    private static final String KEY_MIN_LETTERS = "key_minimum_letters";
    private static final String KEY_MIN_NUMERIC = "key_minimum_numeric";
    private static final String KEY_MIN_LOWER_CASE = "key_minimum_lower_case";
    private static final String KEY_MIN_UPPER_CASE = "key_minimum_upper_case";
    private static final String KEY_MIN_SYMBOLS = "key_minimum_symbols";
    private static final String KEY_MIN_NON_LETTER = "key_minimum_non_letter";

    private static final String KEY_CATEGORY_EXPIRATION = "key_category_expiration";
    private static final String KEY_HISTORY = "key_history";
    private static final String KEY_EXPIRATION_TIMEOUT = "key_expiration_timeout";
    private static final String KEY_EXPIRATION_STATUS = "key_expiration_status";

    private static final String KEY_CATEGORY_LOCK_WIPE = "key_category_lock_wipe";
    private static final String KEY_MAX_TIME_SCREEN_LOCK = "key_max_time_screen_lock";
    private static final String KEY_MAX_FAILS_BEFORE_WIPE = "key_max_fails_before_wipe";
    private static final String KEY_LOCK_SCREEN = "key_lock_screen";
    private static final String KEY_WIPE_DATA = "key_wipe_data";
    private static final String KEY_WIP_DATA_ALL = "key_wipe_data_all";

    private static final String KEY_CATEGORY_ENCRYPTION = "key_category_encryption";
    private static final String KEY_REQUIRE_ENCRYPTION = "key_require_encryption";
    private static final String KEY_ACTIVATE_ENCRYPTION = "key_activate_encryption";

    // Interaction with the DevicePolicyManager
    DevicePolicyManager mDPM;
    ComponentName mDeviceAdminSample;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Prepare to work with the DPM
        mDPM = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        mDeviceAdminSample = new ComponentName(this, DeviceAdminSampleReceiver.class);
    }

    /**
     * We override this method to provide PreferenceActivity with the top-level preference headers.
     */
    @Override
    public void onBuildHeaders(List<Header> target) {
        loadHeadersFromResource(R.xml.device_admin_headers, target);
    }

    /**
     * Helper to determine if we are an active admin
     */
    private boolean isActiveAdmin() {
        return mDPM.isAdminActive(mDeviceAdminSample);
    }

    /**
     * Common fragment code for DevicePolicyManager access.  Provides two shared elements:
     *
     *   1.  Provides instance variables to access activity/context, DevicePolicyManager, etc.
     *   2.  Provides support for the "set password" button(s) shared by multiple fragments.
     */
    public static class AdminSampleFragment extends PreferenceFragment
            implements OnPreferenceChangeListener, OnPreferenceClickListener{

        // Useful instance variables
        protected DeviceAdminSample mActivity;
        protected DevicePolicyManager mDPM;
        protected ComponentName mDeviceAdminSample;
        protected boolean mAdminActive;

        // Optional shared UI
        private PreferenceScreen mSetPassword;
        private EditTextPreference mResetPassword;

        @Override
        public void onActivityCreated(Bundle savedInstanceState) {
            super.onActivityCreated(savedInstanceState);

            // Retrieve the useful instance variables
            mActivity = (DeviceAdminSample) getActivity();
            mDPM = mActivity.mDPM;
            mDeviceAdminSample = mActivity.mDeviceAdminSample;
            mAdminActive = mActivity.isActiveAdmin();

            // Configure the shared UI elements (if they exist)
            mResetPassword = (EditTextPreference) findPreference(KEY_RESET_PASSWORD);
            mSetPassword = (PreferenceScreen) findPreference(KEY_SET_PASSWORD);

            if (mResetPassword != null) {
                mResetPassword.setOnPreferenceChangeListener(this);
            }
            if (mSetPassword != null) {
                mSetPassword.setOnPreferenceClickListener(this);
            }
        }

        @Override
        public void onResume() {
            super.onResume();
            mAdminActive = mActivity.isActiveAdmin();
            reloadSummaries();
            // Resetting the password via API is available only to active admins
            if (mResetPassword != null) {
                mResetPassword.setEnabled(mAdminActive);
            }
        }

        /**
         * Called automatically at every onResume.  Should also call explicitly any time a
         * policy changes that may affect other policy values.
         */
        protected void reloadSummaries() {
            if (mSetPassword != null) {
                if (mAdminActive) {
                    // Show password-sufficient status under Set Password button
                    boolean sufficient = mDPM.isActivePasswordSufficient();
                    mSetPassword.setSummary(sufficient ?
                            R.string.password_sufficient : R.string.password_insufficient);
                } else {
                    mSetPassword.setSummary(null);
                }
            }
        }

        @Override
        public boolean onPreferenceClick(Preference preference) {
            if (mSetPassword != null && preference == mSetPassword) {
                Intent intent = new Intent(DevicePolicyManager.ACTION_SET_NEW_PASSWORD);
                startActivity(intent);
                return true;
            }
            return false;
        }

        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (mResetPassword != null && preference == mResetPassword) {
                doResetPassword((String)newValue);
                return true;
            }
            return false;
        }

        /**
         * This is dangerous, so we prevent automated tests from doing it, and we
         * remind the user after we do it.
         */
        private void doResetPassword(String newPassword) {
            if (alertIfMonkey(mActivity, R.string.monkey_reset_password)) {
                return;
            }
            mDPM.resetPassword(newPassword, DevicePolicyManager.RESET_PASSWORD_REQUIRE_ENTRY);
            AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
            String message = mActivity.getString(R.string.reset_password_warning, newPassword);
            builder.setMessage(message);
            builder.setPositiveButton(R.string.reset_password_ok, null);
            builder.show();
        }

        /**
         * Simple helper for summaries showing local & global (aggregate) policy settings
         */
        protected String localGlobalSummary(Object local, Object global) {
            return getString(R.string.status_local_global, local, global);
        }
    }

    /**
     * PreferenceFragment for "general" preferences.
     */
    public static class GeneralFragment extends AdminSampleFragment
            implements OnPreferenceChangeListener {
        // UI elements
        private CheckBoxPreference mEnableCheckbox;
        private CheckBoxPreference mDisableCameraCheckbox;
        private CheckBoxPreference mDisableKeyguardWidgetsCheckbox;
        private CheckBoxPreference mDisableKeyguardSecureCameraCheckbox;

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            addPreferencesFromResource(R.xml.device_admin_general);
            mEnableCheckbox = (CheckBoxPreference) findPreference(KEY_ENABLE_ADMIN);
            mEnableCheckbox.setOnPreferenceChangeListener(this);
            mDisableCameraCheckbox = (CheckBoxPreference) findPreference(KEY_DISABLE_CAMERA);
            mDisableCameraCheckbox.setOnPreferenceChangeListener(this);
            mDisableKeyguardWidgetsCheckbox =
                (CheckBoxPreference) findPreference(KEY_DISABLE_KEYGUARD_WIDGETS);
            mDisableKeyguardWidgetsCheckbox.setOnPreferenceChangeListener(this);
            mDisableKeyguardSecureCameraCheckbox =
                (CheckBoxPreference) findPreference(KEY_DISABLE_KEYGUARD_SECURE_CAMERA);
            mDisableKeyguardSecureCameraCheckbox.setOnPreferenceChangeListener(this);
        }

        // At onResume time, reload UI with current values as required
        @Override
        public void onResume() {
            super.onResume();
            mEnableCheckbox.setChecked(mAdminActive);
            enableDeviceCapabilitiesArea(mAdminActive);

            if (mAdminActive) {
                mDPM.setCameraDisabled(mDeviceAdminSample, mDisableCameraCheckbox.isChecked());
                mDPM.setKeyguardDisabledFeatures(mDeviceAdminSample, createKeyguardDisabledFlag());
                reloadSummaries();
            }
        }

        int createKeyguardDisabledFlag() {
            int flags = DevicePolicyManager.KEYGUARD_DISABLE_FEATURES_NONE;
            flags |= mDisableKeyguardWidgetsCheckbox.isChecked() ?
                    DevicePolicyManager.KEYGUARD_DISABLE_WIDGETS_ALL : 0;
            flags |= mDisableKeyguardSecureCameraCheckbox.isChecked() ?
                    DevicePolicyManager.KEYGUARD_DISABLE_SECURE_CAMERA : 0;
            return flags;
        }

        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (super.onPreferenceChange(preference, newValue)) {
                return true;
            }
            boolean value = (Boolean) newValue;
            if (preference == mEnableCheckbox) {
                if (value != mAdminActive) {
                    if (value) {
                        // Launch the activity to have the user enable our admin.
                        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
                        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, mDeviceAdminSample);
                        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                                mActivity.getString(R.string.add_admin_extra_app_text));
                        startActivityForResult(intent, REQUEST_CODE_ENABLE_ADMIN);
                        // return false - don't update checkbox until we're really active
                        return false;
                    } else {
                        mDPM.removeActiveAdmin(mDeviceAdminSample);
                        enableDeviceCapabilitiesArea(false);
                        mAdminActive = false;
                    }
                }
            } else if (preference == mDisableCameraCheckbox) {
                mDPM.setCameraDisabled(mDeviceAdminSample, value);
                reloadSummaries();
            } else if (preference == mDisableKeyguardWidgetsCheckbox
                    || preference == mDisableKeyguardSecureCameraCheckbox) {
                mDPM.setKeyguardDisabledFeatures(mDeviceAdminSample, createKeyguardDisabledFlag());
                reloadSummaries();
            }
            return true;
        }

        @Override
        protected void reloadSummaries() {
            super.reloadSummaries();
            String cameraSummary = getString(mDPM.getCameraDisabled(mDeviceAdminSample)
                    ? R.string.camera_disabled : R.string.camera_enabled);
            mDisableCameraCheckbox.setSummary(cameraSummary);

            int disabled = mDPM.getKeyguardDisabledFeatures(mDeviceAdminSample);

            String keyguardWidgetSummary = getString(
                    (disabled & DevicePolicyManager.KEYGUARD_DISABLE_WIDGETS_ALL) != 0 ?
                            R.string.keyguard_widgets_disabled : R.string.keyguard_widgets_enabled);
            mDisableKeyguardWidgetsCheckbox.setSummary(keyguardWidgetSummary);

            String keyguardSecureCameraSummary = getString(
                (disabled & DevicePolicyManager.KEYGUARD_DISABLE_SECURE_CAMERA) != 0 ?
                R.string.keyguard_secure_camera_disabled : R.string.keyguard_secure_camera_enabled);
            mDisableKeyguardSecureCameraCheckbox.setSummary(keyguardSecureCameraSummary);
        }

        /** Updates the device capabilities area (dis/enabling) as the admin is (de)activated */
        private void enableDeviceCapabilitiesArea(boolean enabled) {
            mDisableCameraCheckbox.setEnabled(enabled);
            mDisableKeyguardWidgetsCheckbox.setEnabled(enabled);
            mDisableKeyguardSecureCameraCheckbox.setEnabled(enabled);
        }
    }

    /**
     * PreferenceFragment for "password quality" preferences.
     */
    public static class QualityFragment extends AdminSampleFragment
            implements OnPreferenceChangeListener {

        // Password quality values
        // This list must match the list found in samples/ApiDemos/res/values/arrays.xml
        final static int[] mPasswordQualityValues = new int[] {
            DevicePolicyManager.PASSWORD_QUALITY_UNSPECIFIED,
            DevicePolicyManager.PASSWORD_QUALITY_SOMETHING,
            DevicePolicyManager.PASSWORD_QUALITY_NUMERIC,
            DevicePolicyManager.PASSWORD_QUALITY_ALPHABETIC,
            DevicePolicyManager.PASSWORD_QUALITY_ALPHANUMERIC,
            DevicePolicyManager.PASSWORD_QUALITY_COMPLEX
        };

        // Password quality values (as strings, for the ListPreference entryValues)
        // This list must match the list found in samples/ApiDemos/res/values/arrays.xml
        final static String[] mPasswordQualityValueStrings = new String[] {
            String.valueOf(DevicePolicyManager.PASSWORD_QUALITY_UNSPECIFIED),
            String.valueOf(DevicePolicyManager.PASSWORD_QUALITY_SOMETHING),
            String.valueOf(DevicePolicyManager.PASSWORD_QUALITY_NUMERIC),
            String.valueOf(DevicePolicyManager.PASSWORD_QUALITY_ALPHABETIC),
            String.valueOf(DevicePolicyManager.PASSWORD_QUALITY_ALPHANUMERIC),
            String.valueOf(DevicePolicyManager.PASSWORD_QUALITY_COMPLEX)
        };

        // UI elements
        private PreferenceCategory mQualityCategory;
        private ListPreference mPasswordQuality;
        private EditTextPreference mMinLength;
        private EditTextPreference mMinLetters;
        private EditTextPreference mMinNumeric;
        private EditTextPreference mMinLowerCase;
        private EditTextPreference mMinUpperCase;
        private EditTextPreference mMinSymbols;
        private EditTextPreference mMinNonLetter;

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            addPreferencesFromResource(R.xml.device_admin_quality);

            mQualityCategory = (PreferenceCategory) findPreference(KEY_CATEGORY_QUALITY);
            mPasswordQuality = (ListPreference) findPreference(KEY_QUALITY);
            mMinLength = (EditTextPreference) findPreference(KEY_MIN_LENGTH);
            mMinLetters = (EditTextPreference) findPreference(KEY_MIN_LETTERS);
            mMinNumeric = (EditTextPreference) findPreference(KEY_MIN_NUMERIC);
            mMinLowerCase = (EditTextPreference) findPreference(KEY_MIN_LOWER_CASE);
            mMinUpperCase = (EditTextPreference) findPreference(KEY_MIN_UPPER_CASE);
            mMinSymbols = (EditTextPreference) findPreference(KEY_MIN_SYMBOLS);
            mMinNonLetter = (EditTextPreference) findPreference(KEY_MIN_NON_LETTER);

            mPasswordQuality.setOnPreferenceChangeListener(this);
            mMinLength.setOnPreferenceChangeListener(this);
            mMinLetters.setOnPreferenceChangeListener(this);
            mMinNumeric.setOnPreferenceChangeListener(this);
            mMinLowerCase.setOnPreferenceChangeListener(this);
            mMinUpperCase.setOnPreferenceChangeListener(this);
            mMinSymbols.setOnPreferenceChangeListener(this);
            mMinNonLetter.setOnPreferenceChangeListener(this);

            // Finish setup of the quality dropdown
            mPasswordQuality.setEntryValues(mPasswordQualityValueStrings);
        }

        @Override
        public void onResume() {
            super.onResume();
            mQualityCategory.setEnabled(mAdminActive);
        }

        /**
         * Update the summaries of each item to show the local setting and the global setting.
         */
        @Override
        protected void reloadSummaries() {
            super.reloadSummaries();
            // Show numeric settings for each policy API
            int local, global;
            local = mDPM.getPasswordQuality(mDeviceAdminSample);
            global = mDPM.getPasswordQuality(null);
            mPasswordQuality.setSummary(
                    localGlobalSummary(qualityValueToString(local), qualityValueToString(global)));
            local = mDPM.getPasswordMinimumLength(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumLength(null);
            mMinLength.setSummary(localGlobalSummary(local, global));
            local = mDPM.getPasswordMinimumLetters(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumLetters(null);
            mMinLetters.setSummary(localGlobalSummary(local, global));
            local = mDPM.getPasswordMinimumNumeric(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumNumeric(null);
            mMinNumeric.setSummary(localGlobalSummary(local, global));
            local = mDPM.getPasswordMinimumLowerCase(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumLowerCase(null);
            mMinLowerCase.setSummary(localGlobalSummary(local, global));
            local = mDPM.getPasswordMinimumUpperCase(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumUpperCase(null);
            mMinUpperCase.setSummary(localGlobalSummary(local, global));
            local = mDPM.getPasswordMinimumSymbols(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumSymbols(null);
            mMinSymbols.setSummary(localGlobalSummary(local, global));
            local = mDPM.getPasswordMinimumNonLetter(mDeviceAdminSample);
            global = mDPM.getPasswordMinimumNonLetter(null);
            mMinNonLetter.setSummary(localGlobalSummary(local, global));
        }

        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (super.onPreferenceChange(preference, newValue)) {
                return true;
            }
            String valueString = (String)newValue;
            if (TextUtils.isEmpty(valueString)) {
                return false;
            }
            int value = 0;
            try {
                value = Integer.parseInt(valueString);
            } catch (NumberFormatException nfe) {
                String warning = mActivity.getString(R.string.number_format_warning, valueString);
                Toast.makeText(mActivity, warning, Toast.LENGTH_SHORT).show();
            }
            if (preference == mPasswordQuality) {
                mDPM.setPasswordQuality(mDeviceAdminSample, value);
            } else if (preference == mMinLength) {
                mDPM.setPasswordMinimumLength(mDeviceAdminSample, value);
            } else if (preference == mMinLetters) {
                mDPM.setPasswordMinimumLetters(mDeviceAdminSample, value);
            } else if (preference == mMinNumeric) {
                mDPM.setPasswordMinimumNumeric(mDeviceAdminSample, value);
            } else if (preference == mMinLowerCase) {
                mDPM.setPasswordMinimumLowerCase(mDeviceAdminSample, value);
            } else if (preference == mMinUpperCase) {
                mDPM.setPasswordMinimumUpperCase(mDeviceAdminSample, value);
            } else if (preference == mMinSymbols) {
                mDPM.setPasswordMinimumSymbols(mDeviceAdminSample, value);
            } else if (preference == mMinNonLetter) {
                mDPM.setPasswordMinimumNonLetter(mDeviceAdminSample, value);
            }
            reloadSummaries();
            return true;
        }

        private String qualityValueToString(int quality) {
            for (int i=  0; i < mPasswordQualityValues.length; i++) {
                if (mPasswordQualityValues[i] == quality) {
                    String[] qualities =
                        mActivity.getResources().getStringArray(R.array.password_qualities);
                    return qualities[i];
                }
            }
            return "(0x" + Integer.toString(quality, 16) + ")";
        }
    }

    /**
     * PreferenceFragment for "password expiration" preferences.
     */
    public static class ExpirationFragment extends AdminSampleFragment
            implements OnPreferenceChangeListener, OnPreferenceClickListener {
        private PreferenceCategory mExpirationCategory;
        private EditTextPreference mHistory;
        private EditTextPreference mExpirationTimeout;
        private PreferenceScreen mExpirationStatus;

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            addPreferencesFromResource(R.xml.device_admin_expiration);

            mExpirationCategory = (PreferenceCategory) findPreference(KEY_CATEGORY_EXPIRATION);
            mHistory = (EditTextPreference) findPreference(KEY_HISTORY);
            mExpirationTimeout = (EditTextPreference) findPreference(KEY_EXPIRATION_TIMEOUT);
            mExpirationStatus = (PreferenceScreen) findPreference(KEY_EXPIRATION_STATUS);

            mHistory.setOnPreferenceChangeListener(this);
            mExpirationTimeout.setOnPreferenceChangeListener(this);
            mExpirationStatus.setOnPreferenceClickListener(this);
        }

        @Override
        public void onResume() {
            super.onResume();
            mExpirationCategory.setEnabled(mAdminActive);
        }

        /**
         * Update the summaries of each item to show the local setting and the global setting.
         */
        @Override
        protected void reloadSummaries() {
            super.reloadSummaries();

            int local, global;
            local = mDPM.getPasswordHistoryLength(mDeviceAdminSample);
            global = mDPM.getPasswordHistoryLength(null);
            mHistory.setSummary(localGlobalSummary(local, global));

            long localLong, globalLong;
            localLong = mDPM.getPasswordExpirationTimeout(mDeviceAdminSample);
            globalLong = mDPM.getPasswordExpirationTimeout(null);
            mExpirationTimeout.setSummary(localGlobalSummary(
                    localLong / MS_PER_MINUTE, globalLong / MS_PER_MINUTE));

            String expirationStatus = getExpirationStatus();
            mExpirationStatus.setSummary(expirationStatus);
        }

        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (super.onPreferenceChange(preference, newValue)) {
                return true;
            }
            String valueString = (String)newValue;
            if (TextUtils.isEmpty(valueString)) {
                return false;
            }
            int value = 0;
            try {
                value = Integer.parseInt(valueString);
            } catch (NumberFormatException nfe) {
                String warning = mActivity.getString(R.string.number_format_warning, valueString);
                Toast.makeText(mActivity, warning, Toast.LENGTH_SHORT).show();
            }
            if (preference == mHistory) {
                mDPM.setPasswordHistoryLength(mDeviceAdminSample, value);
            } else if (preference == mExpirationTimeout) {
                mDPM.setPasswordExpirationTimeout(mDeviceAdminSample, value * MS_PER_MINUTE);
            }
            reloadSummaries();
            return true;
        }

        @Override
        public boolean onPreferenceClick(Preference preference) {
            if (super.onPreferenceClick(preference)) {
                return true;
            }
            if (preference == mExpirationStatus) {
                String expirationStatus = getExpirationStatus();
                mExpirationStatus.setSummary(expirationStatus);
                return true;
            }
            return false;
        }

        /**
         * Create a summary string describing the expiration status for the sample app,
         * as well as the global (aggregate) status.
         */
        private String getExpirationStatus() {
            // expirations are absolute;  convert to relative for display
            long localExpiration = mDPM.getPasswordExpiration(mDeviceAdminSample);
            long globalExpiration = mDPM.getPasswordExpiration(null);
            long now = System.currentTimeMillis();

            // local expiration
            String local;
            if (localExpiration == 0) {
                local = mActivity.getString(R.string.expiration_status_none);
            } else {
                localExpiration -= now;
                String dms = timeToDaysMinutesSeconds(mActivity, Math.abs(localExpiration));
                if (localExpiration >= 0) {
                    local = mActivity.getString(R.string.expiration_status_future, dms);
                } else {
                    local = mActivity.getString(R.string.expiration_status_past, dms);
                }
            }

            // global expiration
            String global;
            if (globalExpiration == 0) {
                global = mActivity.getString(R.string.expiration_status_none);
            } else {
                globalExpiration -= now;
                String dms = timeToDaysMinutesSeconds(mActivity, Math.abs(globalExpiration));
                if (globalExpiration >= 0) {
                    global = mActivity.getString(R.string.expiration_status_future, dms);
                } else {
                    global = mActivity.getString(R.string.expiration_status_past, dms);
                }
            }
            return mActivity.getString(R.string.status_local_global, local, global);
        }
    }

    /**
     * PreferenceFragment for "lock screen & wipe" preferences.
     */
    public static class LockWipeFragment extends AdminSampleFragment
            implements OnPreferenceChangeListener, OnPreferenceClickListener {
        private PreferenceCategory mLockWipeCategory;
        private EditTextPreference mMaxTimeScreenLock;
        private EditTextPreference mMaxFailures;
        private PreferenceScreen mLockScreen;
        private PreferenceScreen mWipeData;
        private PreferenceScreen mWipeAppData;

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            addPreferencesFromResource(R.xml.device_admin_lock_wipe);

            mLockWipeCategory = (PreferenceCategory) findPreference(KEY_CATEGORY_LOCK_WIPE);
            mMaxTimeScreenLock = (EditTextPreference) findPreference(KEY_MAX_TIME_SCREEN_LOCK);
            mMaxFailures = (EditTextPreference) findPreference(KEY_MAX_FAILS_BEFORE_WIPE);
            mLockScreen = (PreferenceScreen) findPreference(KEY_LOCK_SCREEN);
            mWipeData = (PreferenceScreen) findPreference(KEY_WIPE_DATA);
            mWipeAppData = (PreferenceScreen) findPreference(KEY_WIP_DATA_ALL);

            mMaxTimeScreenLock.setOnPreferenceChangeListener(this);
            mMaxFailures.setOnPreferenceChangeListener(this);
            mLockScreen.setOnPreferenceClickListener(this);
            mWipeData.setOnPreferenceClickListener(this);
            mWipeAppData.setOnPreferenceClickListener(this);
        }

        @Override
        public void onResume() {
            super.onResume();
            mLockWipeCategory.setEnabled(mAdminActive);
        }

        /**
         * Update the summaries of each item to show the local setting and the global setting.
         */
        @Override
        protected void reloadSummaries() {
            super.reloadSummaries();

            long localLong, globalLong;
            localLong = mDPM.getMaximumTimeToLock(mDeviceAdminSample);
            globalLong = mDPM.getMaximumTimeToLock(null);
            mMaxTimeScreenLock.setSummary(localGlobalSummary(
                    localLong / MS_PER_MINUTE, globalLong / MS_PER_MINUTE));

            int local, global;
            local = mDPM.getMaximumFailedPasswordsForWipe(mDeviceAdminSample);
            global = mDPM.getMaximumFailedPasswordsForWipe(null);
            mMaxFailures.setSummary(localGlobalSummary(local, global));
        }

        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (super.onPreferenceChange(preference, newValue)) {
                return true;
            }
            String valueString = (String)newValue;
            if (TextUtils.isEmpty(valueString)) {
                return false;
            }
            int value = 0;
            try {
                value = Integer.parseInt(valueString);
            } catch (NumberFormatException nfe) {
                String warning = mActivity.getString(R.string.number_format_warning, valueString);
                Toast.makeText(mActivity, warning, Toast.LENGTH_SHORT).show();
            }
            if (preference == mMaxTimeScreenLock) {
                mDPM.setMaximumTimeToLock(mDeviceAdminSample, value * MS_PER_MINUTE);
            } else if (preference == mMaxFailures) {
                if (alertIfMonkey(mActivity, R.string.monkey_wipe_data)) {
                    return true;
                }
                mDPM.setMaximumFailedPasswordsForWipe(mDeviceAdminSample, value);
            }
            reloadSummaries();
            return true;
        }

        @Override
        public boolean onPreferenceClick(Preference preference) {
            if (super.onPreferenceClick(preference)) {
                return true;
            }
            if (preference == mLockScreen) {
                if (alertIfMonkey(mActivity, R.string.monkey_lock_screen)) {
                    return true;
                }
                mDPM.lockNow();
                return true;
            } else if (preference == mWipeData || preference == mWipeAppData) {
                if (alertIfMonkey(mActivity, R.string.monkey_wipe_data)) {
                    return true;
                }
                promptForRealDeviceWipe(preference == mWipeAppData);
                return true;
            }
            return false;
        }

        /**
         * Wiping data is real, so we don't want it to be easy.  Show two alerts before wiping.
         */
        private void promptForRealDeviceWipe(final boolean wipeAllData) {
            final DeviceAdminSample activity = mActivity;

            AlertDialog.Builder builder = new AlertDialog.Builder(activity);
            builder.setMessage(R.string.wipe_warning_first);
            builder.setPositiveButton(R.string.wipe_warning_first_ok,
                    new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    AlertDialog.Builder builder = new AlertDialog.Builder(activity);
                    if (wipeAllData) {
                        builder.setMessage(R.string.wipe_warning_second_full);
                    } else {
                        builder.setMessage(R.string.wipe_warning_second);
                    }
                    builder.setPositiveButton(R.string.wipe_warning_second_ok,
                            new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            boolean stillActive = mActivity.isActiveAdmin();
                            if (stillActive) {
                                mDPM.wipeData(wipeAllData
                                        ? DevicePolicyManager.WIPE_EXTERNAL_STORAGE : 0);
                            }
                        }
                    });
                    builder.setNegativeButton(R.string.wipe_warning_second_no, null);
                    builder.show();
                }
            });
            builder.setNegativeButton(R.string.wipe_warning_first_no, null);
            builder.show();
        }
    }

    /**
     * PreferenceFragment for "encryption" preferences.
     */
    public static class EncryptionFragment extends AdminSampleFragment
            implements OnPreferenceChangeListener, OnPreferenceClickListener {
        private PreferenceCategory mEncryptionCategory;
        private CheckBoxPreference mRequireEncryption;
        private PreferenceScreen mActivateEncryption;

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
            addPreferencesFromResource(R.xml.device_admin_encryption);

            mEncryptionCategory = (PreferenceCategory) findPreference(KEY_CATEGORY_ENCRYPTION);
            mRequireEncryption = (CheckBoxPreference) findPreference(KEY_REQUIRE_ENCRYPTION);
            mActivateEncryption = (PreferenceScreen) findPreference(KEY_ACTIVATE_ENCRYPTION);

            mRequireEncryption.setOnPreferenceChangeListener(this);
            mActivateEncryption.setOnPreferenceClickListener(this);
        }

        @Override
        public void onResume() {
            super.onResume();
            mEncryptionCategory.setEnabled(mAdminActive);
            mRequireEncryption.setChecked(mDPM.getStorageEncryption(mDeviceAdminSample));
        }

        /**
         * Update the summaries of each item to show the local setting and the global setting.
         */
        @Override
        protected void reloadSummaries() {
            super.reloadSummaries();

            boolean local, global;
            local = mDPM.getStorageEncryption(mDeviceAdminSample);
            global = mDPM.getStorageEncryption(null);
            mRequireEncryption.setSummary(localGlobalSummary(local, global));

            int deviceStatusCode = mDPM.getStorageEncryptionStatus();
            String deviceStatus = statusCodeToString(deviceStatusCode);
            String status = mActivity.getString(R.string.status_device_encryption, deviceStatus);
            mActivateEncryption.setSummary(status);
        }

        @Override
        public boolean onPreferenceChange(Preference preference, Object newValue) {
            if (super.onPreferenceChange(preference, newValue)) {
                return true;
            }
            if (preference == mRequireEncryption) {
                boolean newActive = (Boolean) newValue;
                mDPM.setStorageEncryption(mDeviceAdminSample, newActive);
                reloadSummaries();
                return true;
            }
            return true;
        }

        @Override
        public boolean onPreferenceClick(Preference preference) {
            if (super.onPreferenceClick(preference)) {
                return true;
            }
            if (preference == mActivateEncryption) {
                if (alertIfMonkey(mActivity, R.string.monkey_encryption)) {
                    return true;
                }
                // Check to see if encryption is even supported on this device (it's optional).
                if (mDPM.getStorageEncryptionStatus() ==
                        DevicePolicyManager.ENCRYPTION_STATUS_UNSUPPORTED) {
                    AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
                    builder.setMessage(R.string.encryption_not_supported);
                    builder.setPositiveButton(R.string.encryption_not_supported_ok, null);
                    builder.show();
                    return true;
                }
                // Launch the activity to activate encryption.  May or may not return!
                Intent intent = new Intent(DevicePolicyManager.ACTION_START_ENCRYPTION);
                startActivityForResult(intent, REQUEST_CODE_START_ENCRYPTION);
                return true;
            }
            return false;
        }

        private String statusCodeToString(int newStatusCode) {
            int newStatus = R.string.encryption_status_unknown;
            switch (newStatusCode) {
                case DevicePolicyManager.ENCRYPTION_STATUS_UNSUPPORTED:
                    newStatus = R.string.encryption_status_unsupported;
                    break;
                case DevicePolicyManager.ENCRYPTION_STATUS_INACTIVE:
                    newStatus = R.string.encryption_status_inactive;
                    break;
                case DevicePolicyManager.ENCRYPTION_STATUS_ACTIVATING:
                    newStatus = R.string.encryption_status_activating;
                    break;
                case DevicePolicyManager.ENCRYPTION_STATUS_ACTIVE:
                    newStatus = R.string.encryption_status_active;
                    break;
            }
            return mActivity.getString(newStatus);
        }
    }

    /**
     * Simple converter used for long expiration times reported in mSec.
     */
    private static String timeToDaysMinutesSeconds(Context context, long time) {
        long days = time / MS_PER_DAY;
        long hours = (time / MS_PER_HOUR) % 24;
        long minutes = (time / MS_PER_MINUTE) % 60;
        return context.getString(R.string.status_days_hours_minutes, days, hours, minutes);
    }

    /**
     * If the "user" is a monkey, post an alert and notify the caller.  This prevents automated
     * test frameworks from stumbling into annoying or dangerous operations.
     */
    private static boolean alertIfMonkey(Context context, int stringId) {
        if (ActivityManager.isUserAMonkey()) {
            AlertDialog.Builder builder = new AlertDialog.Builder(context);
            builder.setMessage(stringId);
            builder.setPositiveButton(R.string.monkey_ok, null);
            builder.show();
            return true;
        } else {
            return false;
        }
    }

    /**
     * Sample implementation of a DeviceAdminReceiver.  Your controller must provide one,
     * although you may or may not implement all of the methods shown here.
     *
     * All callbacks are on the UI thread and your implementations should not engage in any
     * blocking operations, including disk I/O.
     */
    public static class DeviceAdminSampleReceiver extends DeviceAdminReceiver {
        void showToast(Context context, String msg) {
            String status = context.getString(R.string.admin_receiver_status, msg);
            Toast.makeText(context, status, Toast.LENGTH_SHORT).show();
        }

        @Override
        public void onEnabled(Context context, Intent intent) {
            showToast(context, context.getString(R.string.admin_receiver_status_enabled));
        }

        @Override
        public CharSequence onDisableRequested(Context context, Intent intent) {
            return context.getString(R.string.admin_receiver_status_disable_warning);
        }

        @Override
        public void onDisabled(Context context, Intent intent) {
            showToast(context, context.getString(R.string.admin_receiver_status_disabled));
        }

        @Override
        public void onPasswordChanged(Context context, Intent intent) {
            showToast(context, context.getString(R.string.admin_receiver_status_pw_changed));
        }

        @Override
        public void onPasswordFailed(Context context, Intent intent) {
            showToast(context, context.getString(R.string.admin_receiver_status_pw_failed));
        }

        @Override
        public void onPasswordSucceeded(Context context, Intent intent) {
            showToast(context, context.getString(R.string.admin_receiver_status_pw_succeeded));
        }

        @Override
        public void onPasswordExpiring(Context context, Intent intent) {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(
                    Context.DEVICE_POLICY_SERVICE);
            long expr = dpm.getPasswordExpiration(
                    new ComponentName(context, DeviceAdminSampleReceiver.class));
            long delta = expr - System.currentTimeMillis();
            boolean expired = delta < 0L;
            String message = context.getString(expired ?
                    R.string.expiration_status_past : R.string.expiration_status_future);
            showToast(context, message);
            Log.v(TAG, message);
        }
    }
}
