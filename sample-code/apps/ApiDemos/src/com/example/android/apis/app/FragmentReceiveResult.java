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

package com.example.android.apis.app;

import com.example.android.apis.R;

import android.app.Activity;
import android.app.Fragment;
import android.app.FragmentTransaction;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;

public class FragmentReceiveResult extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT);
        FrameLayout frame = new FrameLayout(this);
        frame.setId(R.id.simple_fragment);
        setContentView(frame, lp);
        
        if (savedInstanceState == null) {
            // Do first time initialization -- add fragment. 
            Fragment newFragment = new ReceiveResultFragment();
            FragmentTransaction ft = getFragmentManager().beginTransaction();
            ft.add(R.id.simple_fragment, newFragment).commit();
        }
    }

    public static class ReceiveResultFragment extends Fragment {
        // Definition of the one requestCode we use for receiving resuls.
        static final private int GET_CODE = 0;

        private TextView mResults;

        private OnClickListener mGetListener = new OnClickListener() {
            public void onClick(View v) {
                // Start the activity whose result we want to retrieve.  The
                // result will come back with request code GET_CODE.
                Intent intent = new Intent(getActivity(), SendResult.class);
                startActivityForResult(intent, GET_CODE);
            }
        };

        @Override
        public void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);
        }

        @Override
        public void onSaveInstanceState(Bundle outState) {
            super.onSaveInstanceState(outState);
        }

        @Override
        public View onCreateView(LayoutInflater inflater, ViewGroup container,
                Bundle savedInstanceState) {
            View v = inflater.inflate(R.layout.receive_result, container, false);
            
            // Retrieve the TextView widget that will display results.
            mResults = (TextView)v.findViewById(R.id.results);

            // This allows us to later extend the text buffer.
            mResults.setText(mResults.getText(), TextView.BufferType.EDITABLE);

            // Watch for button clicks.
            Button getButton = (Button)v.findViewById(R.id.get);
            getButton.setOnClickListener(mGetListener);
            
            return v;
        }

        /**
         * This method is called when the sending activity has finished, with the
         * result it supplied.
         */
        @Override
        public void onActivityResult(int requestCode, int resultCode, Intent data) {
            // You can use the requestCode to select between multiple child
            // activities you may have started.  Here there is only one thing
            // we launch.
            if (requestCode == GET_CODE) {

                // We will be adding to our text.
                Editable text = (Editable)mResults.getText();

                // This is a standard resultCode that is sent back if the
                // activity doesn't supply an explicit result.  It will also
                // be returned if the activity failed to launch.
                if (resultCode == RESULT_CANCELED) {
                    text.append("(cancelled)");

                // Our protocol with the sending activity is that it will send
                // text in 'data' as its result.
                } else {
                    text.append("(okay ");
                    text.append(Integer.toString(resultCode));
                    text.append(") ");
                    if (data != null) {
                        text.append(data.getAction());
                    }
                }

                text.append("\n");
            }
        }
    }
}
