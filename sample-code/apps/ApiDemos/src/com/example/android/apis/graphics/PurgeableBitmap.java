/*
 * Copyright (C) 2009 The Android Open Source Project
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

package com.example.android.apis.graphics;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.PackageManager.NameNotFoundException;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;

/**
 * PurgeableBitmap demonstrates the effects of setting Bitmaps as being
 * purgeable.
 *
 * In the NonPurgeable case, an encoded bitstream is decoded to a different
 * Bitmap over and over again up to 200 times until out-of-memory occurs.
 * In contrast, the Purgeable case shows that the system can complete decoding
 * the encoded bitstream 200 times without hitting the out-of-memory case.
 */
public class PurgeableBitmap extends GraphicsActivity {

    private PurgeableBitmapView mView;
    private final RefreshHandler mRedrawHandler = new RefreshHandler();

    class RefreshHandler extends Handler {

        @Override
        public void handleMessage(Message msg) {
            int index = mView.update(this);
            if (index > 0) {
                showAlertDialog(getDialogMessage(true, index));
            } else if (index < 0){
                mView.invalidate();
                showAlertDialog(getDialogMessage(false, -index));
            } else {
              mView.invalidate();
            }
        }

        public void sleep(long delayMillis) {
            this.removeMessages(0);
            sendMessageDelayed(obtainMessage(0), delayMillis);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mView = new PurgeableBitmapView(this,  detectIfPurgeableRequest());
        mRedrawHandler.sleep(0);
        setContentView(mView);
    }

    private boolean detectIfPurgeableRequest() {
        PackageManager pm = getPackageManager();
        CharSequence labelSeq = null;
        try {
          ActivityInfo info = pm.getActivityInfo(this.getComponentName(),
              PackageManager.GET_META_DATA);
          labelSeq = info.loadLabel(pm);
        } catch (NameNotFoundException e) {
          e.printStackTrace();
          return false;
        }

        String[] components = labelSeq.toString().split("/");
        if (components[components.length - 1].equals("Purgeable")) {
            return true;
        } else {
            return false;
        }
    }

    private String getDialogMessage(boolean isOutOfMemory, int index) {
         StringBuilder sb = new StringBuilder();
         if (isOutOfMemory) {
             sb.append("Out of memery occurs when the ");
             sb.append(index);
             sb.append("th Bitmap is decoded.");
         } else {
             sb.append("Complete decoding ")
               .append(index)
               .append(" bitmaps without running out of memory.");
         }
         return sb.toString();
    }

    private void showAlertDialog(String message) {
      AlertDialog.Builder builder = new AlertDialog.Builder(this);
      builder.setMessage(message)
             .setCancelable(false)
             .setPositiveButton("Yes", new DialogInterface.OnClickListener() {
                 public void onClick(DialogInterface dialog, int id) {
                                 }
             });
      AlertDialog alert = builder.create();
      alert.show();
    }


}
