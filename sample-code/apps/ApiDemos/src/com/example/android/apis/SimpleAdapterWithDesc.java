package com.example.android.apis;

import java.util.List;
import java.util.Map;

import android.content.Context;
import android.view.View;
import android.view.ViewGroup;
import android.widget.SimpleAdapter;
import android.widget.TextView;

public class SimpleAdapterWithDesc extends SimpleAdapter {

    public SimpleAdapterWithDesc(Context context,
            List<? extends Map<String, ?>> data, int resource, String[] from,
            int[] to) {
        super(context, data, resource, from, to);
    }
    
    public View getView(int position, View convertView, ViewGroup parent) {
        TextView myView = (TextView)super.getView(position, convertView, parent);
        myView.setContentDescription(myView.getText());
        return myView;
    }
    
}