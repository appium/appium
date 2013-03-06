/*
 * Copyright (C) 2011 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.example.android.apis.accessibility;

import com.example.android.apis.R;

import android.accessibilityservice.AccessibilityService;
import android.text.TextUtils;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityRecord;
import android.speech.tts.TextToSpeech;
import android.speech.tts.TextToSpeech.OnInitListener;

import java.util.Locale;

/**
 * This class demonstrates how an accessibility service can query
 * window content to improve the feedback given to the user.
 */
public class TaskBackService extends AccessibilityService implements OnInitListener {

    /** Tag for logging. */
    private static final String LOG_TAG = "TaskBackService/onAccessibilityEvent";

    /** Comma separator. */
    private static final String SEPARATOR = ", ";

    /** The class name of TaskListView - for simplicity we speak only its items. */
    private static final String TASK_LIST_VIEW_CLASS_NAME =
        "com.example.android.apis.accessibility.TaskListView";

    /** Flag whether Text-To-Speech is initialized. */
    private boolean mTextToSpeechInitialized;

    /** Handle to the Text-To-Speech engine. */
    private TextToSpeech mTts;

    /**
     * {@inheritDoc}
     */
    @Override
    public void onServiceConnected() {
        // Initializes the Text-To-Speech engine as soon as the service is connected.
        mTts = new TextToSpeech(getApplicationContext(), this);
    }

    /**
     * Processes an AccessibilityEvent, by traversing the View's tree and
     * putting together a message to speak to the user.
     */
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!mTextToSpeechInitialized) {
            Log.e(LOG_TAG, "Text-To-Speech engine not ready.  Bailing out.");
            return;
        }

        // This AccessibilityNodeInfo represents the view that fired the
        // AccessibilityEvent. The following code will use it to traverse the
        // view hierarchy, using this node as a starting point.
        //
        // NOTE: Every method that returns an AccessibilityNodeInfo may return null,
        // because the explored window is in another process and the
        // corresponding View might be gone by the time your request reaches the
        // view hierarchy.
        AccessibilityNodeInfo source = event.getSource();
        if (source == null) {
            return;
        }

        // Grab the parent of the view that fired the event.
        AccessibilityNodeInfo rowNode = getListItemNodeInfo(source);
        if (rowNode == null) {
            return;
        }

        // Using this parent, get references to both child nodes, the label and the checkbox.
        AccessibilityNodeInfo labelNode = rowNode.getChild(0);
        if (labelNode == null) {
            rowNode.recycle();
            return;
        }

        AccessibilityNodeInfo completeNode = rowNode.getChild(1);
        if (completeNode == null) {
            rowNode.recycle();
            return;
        }

        // Determine what the task is and whether or not it's complete, based on
        // the text inside the label, and the state of the check-box.
        if (rowNode.getChildCount() < 2 || !rowNode.getChild(1).isCheckable()) {
            rowNode.recycle();
            return;
        }

        CharSequence taskLabel = labelNode.getText();
        final boolean isComplete = completeNode.isChecked();

        String completeStr = null;
        if (isComplete) {
            completeStr = getString(R.string.task_complete);
        } else {
            completeStr = getString(R.string.task_not_complete);
        }

        String taskStr = getString(R.string.task_complete_template, taskLabel, completeStr);
        StringBuilder utterance = new StringBuilder(taskStr);

        // The custom ListView added extra context to the event by adding an
        // AccessibilityRecord to it. Extract that from the event and read it.
        final int records = event.getRecordCount();
        for (int i = 0; i < records; i++) {
            AccessibilityRecord record = event.getRecord(i);
            CharSequence contentDescription = record.getContentDescription();
            if (!TextUtils.isEmpty(contentDescription )) {
                utterance.append(SEPARATOR);
                utterance.append(contentDescription);
            }
        }

        // Announce the utterance.
        mTts.speak(utterance.toString(), TextToSpeech.QUEUE_FLUSH, null);
        Log.d(LOG_TAG, utterance.toString());
    }

    private AccessibilityNodeInfo getListItemNodeInfo(AccessibilityNodeInfo source) {
        AccessibilityNodeInfo current = source;
        while (true) {
            AccessibilityNodeInfo parent = current.getParent();
            if (parent == null) {
                return null;
            }
            if (TASK_LIST_VIEW_CLASS_NAME.equals(parent.getClassName())) {
                return current;
            }
            // NOTE: Recycle the infos.
            AccessibilityNodeInfo oldCurrent = current;
            current = parent;
            oldCurrent.recycle();
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void onInterrupt() {
        /* do nothing */
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void onInit(int status) {
        // Set a flag so that the TaskBackService knows that the Text-To-Speech
        // engine has been initialized, and can now handle speaking requests.
        if (status == TextToSpeech.SUCCESS) {
            mTts.setLanguage(Locale.US);
            mTextToSpeechInitialized = true;
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mTextToSpeechInitialized) {
            mTts.shutdown();
        }
    }
}
