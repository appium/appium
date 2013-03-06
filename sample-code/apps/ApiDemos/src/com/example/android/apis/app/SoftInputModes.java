package com.example.android.apis.app;

import com.example.android.apis.R;

import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.AdapterView.OnItemSelectedListener;

/**
 * Demonstrates how the various soft input modes impact window resizing.
 */
public class SoftInputModes extends Activity {
    Spinner mResizeMode;
    final CharSequence[] mResizeModeLabels = new CharSequence[] {
            "Unspecified", "Resize", "Pan", "Nothing"
    };
    final int[] mResizeModeValues = new int[] {
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_UNSPECIFIED,
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE,
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN,
            WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING,
    };
    
    /**
     * Initialization of the Activity after it is first created.  Here we use
     * {@link android.app.Activity#setContentView setContentView()} to set up
     * the Activity's content, and retrieve the EditText widget whose state we
     * will persistent.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Be sure to call the super class.
        super.onCreate(savedInstanceState);

        // See assets/res/any/layout/save_restore_state.xml for this
        // view layout definition, which is being set here as
        // the content of our screen.
        setContentView(R.layout.soft_input_modes);
        
        mResizeMode = (Spinner)findViewById(R.id.resize_mode);
        ArrayAdapter<CharSequence> adapter = new ArrayAdapter<CharSequence>(this,
                android.R.layout.simple_spinner_item, mResizeModeLabels);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        mResizeMode.setAdapter(adapter);
        mResizeMode.setSelection(0);
        mResizeMode.setOnItemSelectedListener(
                new OnItemSelectedListener() {
                    public void onItemSelected(
                            AdapterView<?> parent, View view, int position, long id) {
                        getWindow().setSoftInputMode(mResizeModeValues[position]);
                    }

                    public void onNothingSelected(AdapterView<?> parent) {
                        getWindow().setSoftInputMode(mResizeModeValues[0]);
                    }
                });
    }
}
