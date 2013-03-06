/*
 * Copyright (C) 2012 The Android Open Source Project
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

import android.app.Activity;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.RemoteException;
import android.os.IBinder;
import android.os.RemoteCallbackList;
import android.util.Log;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.TextView;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

/**
 * This is an example if implementing a Service that uses android:isolatedProcess.
 */
public class IsolatedService extends Service {
    /**
     * This is a list of callbacks that have been registered with the
     * service.  Note that this is package scoped (instead of private) so
     * that it can be accessed more efficiently from inner classes.
     */
    final RemoteCallbackList<IRemoteServiceCallback> mCallbacks
            = new RemoteCallbackList<IRemoteServiceCallback>();
    
    int mValue = 0;
    
    @Override
    public void onCreate() {
        Log.i("IsolatedService", "Creating IsolatedService: " + this);
    }

    @Override
    public void onDestroy() {
        Log.i("IsolatedService", "Destroying IsolatedService: " + this);
        // Unregister all callbacks.
        mCallbacks.kill();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return mBinder;
    }

    /**
     * The IRemoteInterface is defined through IDL
     */
    private final IRemoteService.Stub mBinder = new IRemoteService.Stub() {
        public void registerCallback(IRemoteServiceCallback cb) {
            if (cb != null) mCallbacks.register(cb);
        }
        public void unregisterCallback(IRemoteServiceCallback cb) {
            if (cb != null) mCallbacks.unregister(cb);
        }
    };
    
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Log.i("IsolatedService", "Task removed in " + this + ": " + rootIntent);
        stopSelf();
    }

    private void broadcastValue(int value) {
        // Broadcast to all clients the new value.
        final int N = mCallbacks.beginBroadcast();
        for (int i=0; i<N; i++) {
            try {
                mCallbacks.getBroadcastItem(i).valueChanged(value);
            } catch (RemoteException e) {
                // The RemoteCallbackList will take care of removing
                // the dead object for us.
            }
        }
        mCallbacks.finishBroadcast();
    }
    
    // ----------------------------------------------------------------------
    
    public static class Controller extends Activity {
        static class ServiceInfo {
            final Activity mActivity;
            final Class<?> mClz;
            final TextView mStatus;
            boolean mServiceBound;
            IRemoteService mService;

            ServiceInfo(Activity activity, Class<?> clz,
                    int start, int stop, int bind, int status) {
                mActivity = activity;
                mClz = clz;
                Button button = (Button)mActivity.findViewById(start);
                button.setOnClickListener(mStartListener);
                button = (Button)mActivity.findViewById(stop);
                button.setOnClickListener(mStopListener);
                CheckBox cb = (CheckBox)mActivity.findViewById(bind);
                cb.setOnClickListener(mBindListener);
                mStatus = (TextView)mActivity.findViewById(status);
            }

            void destroy() {
                if (mServiceBound) {
                    mActivity.unbindService(mConnection);
                }
            }

            private OnClickListener mStartListener = new OnClickListener() {
                public void onClick(View v) {
                    mActivity.startService(new Intent(mActivity, mClz));
                }
            };

            private OnClickListener mStopListener = new OnClickListener() {
                public void onClick(View v) {
                    mActivity.stopService(new Intent(mActivity, mClz));
                }
            };

            private OnClickListener mBindListener = new OnClickListener() {
                public void onClick(View v) {
                    if (((CheckBox)v).isChecked()) {
                        if (!mServiceBound) {
                            if (mActivity.bindService(new Intent(mActivity, mClz),
                                    mConnection, Context.BIND_AUTO_CREATE)) {
                                mServiceBound = true;
                                mStatus.setText("BOUND");
                            }
                        }
                    } else {
                        if (mServiceBound) {
                            mActivity.unbindService(mConnection);
                            mServiceBound = false;
                            mStatus.setText("");
                        }
                    }
                }
            };

            private ServiceConnection mConnection = new ServiceConnection() {
                public void onServiceConnected(ComponentName className,
                        IBinder service) {
                    mService = IRemoteService.Stub.asInterface(service);
                    if (mServiceBound) {
                        mStatus.setText("CONNECTED");
                    }
                }

                public void onServiceDisconnected(ComponentName className) {
                    // This is called when the connection with the service has been
                    // unexpectedly disconnected -- that is, its process crashed.
                    mService = null;
                    if (mServiceBound) {
                        mStatus.setText("DISCONNECTED");
                    }
                }
            };
        }

        ServiceInfo mService1;
        ServiceInfo mService2;

        @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);

            setContentView(R.layout.isolated_service_controller);

            mService1 = new ServiceInfo(this, IsolatedService.class, R.id.start1, R.id.stop1,
                    R.id.bind1, R.id.status1);
            mService2 = new ServiceInfo(this, IsolatedService2.class, R.id.start2, R.id.stop2,
                    R.id.bind2, R.id.status2);
        }

        @Override
        protected void onDestroy() {
            super.onDestroy();
            mService1.destroy();
            mService2.destroy();
        }
    }
}
