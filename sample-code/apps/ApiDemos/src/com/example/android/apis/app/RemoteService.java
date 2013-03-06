/*
 * Copyright (C) 2007 The Android Open Source Project
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
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.RemoteException;
import android.os.Handler;
import android.os.IBinder;
import android.os.Message;
import android.os.Process;
import android.os.RemoteCallbackList;
import android.view.View;
import android.view.View.OnClickListener;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

// Need the following import to get access to the app resources, since this
// class is in a sub-package.
import com.example.android.apis.R;

/**
 * This is an example of implementing an application service that runs in a
 * different process than the application.  Because it can be in another
 * process, we must use IPC to interact with it.  The
 * {@link Controller} and {@link Binding} classes
 * show how to interact with the service.
 * 
 * <p>Note that most applications <strong>do not</strong> need to deal with
 * the complexity shown here.  If your application simply has a service
 * running in its own process, the {@link LocalService} sample shows a much
 * simpler way to interact with it.
 */
public class RemoteService extends Service {
    /**
     * This is a list of callbacks that have been registered with the
     * service.  Note that this is package scoped (instead of private) so
     * that it can be accessed more efficiently from inner classes.
     */
    final RemoteCallbackList<IRemoteServiceCallback> mCallbacks
            = new RemoteCallbackList<IRemoteServiceCallback>();
    
    int mValue = 0;
    NotificationManager mNM;
    
    @Override
    public void onCreate() {
        mNM = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);

        // Display a notification about us starting.
        showNotification();
        
        // While this service is running, it will continually increment a
        // number.  Send the first message that is used to perform the
        // increment.
        mHandler.sendEmptyMessage(REPORT_MSG);
    }

    @Override
    public void onDestroy() {
        // Cancel the persistent notification.
        mNM.cancel(R.string.remote_service_started);

        // Tell the user we stopped.
        Toast.makeText(this, R.string.remote_service_stopped, Toast.LENGTH_SHORT).show();
        
        // Unregister all callbacks.
        mCallbacks.kill();
        
        // Remove the next pending message to increment the counter, stopping
        // the increment loop.
        mHandler.removeMessages(REPORT_MSG);
    }
    

    @Override
    public IBinder onBind(Intent intent) {
        // Select the interface to return.  If your service only implements
        // a single interface, you can just return it here without checking
        // the Intent.
        if (IRemoteService.class.getName().equals(intent.getAction())) {
            return mBinder;
        }
        if (ISecondary.class.getName().equals(intent.getAction())) {
            return mSecondaryBinder;
        }
        return null;
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

    /**
     * A secondary interface to the service.
     */
    private final ISecondary.Stub mSecondaryBinder = new ISecondary.Stub() {
        public int getPid() {
            return Process.myPid();
        }
        public void basicTypes(int anInt, long aLong, boolean aBoolean,
                float aFloat, double aDouble, String aString) {
        }
    };

    
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Toast.makeText(this, "Task removed: " + rootIntent, Toast.LENGTH_LONG).show();
    }
    
    private static final int REPORT_MSG = 1;

    /**
     * Our Handler used to execute operations on the main thread.  This is used
     * to schedule increments of our value.
     */
    private final Handler mHandler = new Handler() {
        @Override public void handleMessage(Message msg) {
            switch (msg.what) {
                
                // It is time to bump the value!
                case REPORT_MSG: {
                    // Up it goes.
                    int value = ++mValue;
                    
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
                    
                    // Repeat every 1 second.
                    sendMessageDelayed(obtainMessage(REPORT_MSG), 1*1000);
                } break;
                default:
                    super.handleMessage(msg);
            }
        }
    };

    /**
     * Show a notification while this service is running.
     */
    private void showNotification() {
        // In this sample, we'll use the same text for the ticker and the expanded notification
        CharSequence text = getText(R.string.remote_service_started);

        // Set the icon, scrolling text and timestamp
        Notification notification = new Notification(R.drawable.stat_sample, text,
                System.currentTimeMillis());

        // The PendingIntent to launch our activity if the user selects this notification
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0,
                new Intent(this, Controller.class), 0);

        // Set the info for the views that show in the notification panel.
        notification.setLatestEventInfo(this, getText(R.string.remote_service_label),
                       text, contentIntent);

        // Send the notification.
        // We use a string id because it is a unique number.  We use it later to cancel.
        mNM.notify(R.string.remote_service_started, notification);
    }
    
    // ----------------------------------------------------------------------
    
    /**
     * <p>Example of explicitly starting and stopping the remove service.
     * This demonstrates the implementation of a service that runs in a different
     * process than the rest of the application, which is explicitly started and stopped
     * as desired.</p>
     * 
     * <p>Note that this is implemented as an inner class only keep the sample
     * all together; typically this code would appear in some separate class.
     */
    public static class Controller extends Activity {
        @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);

            setContentView(R.layout.remote_service_controller);

            // Watch for button clicks.
            Button button = (Button)findViewById(R.id.start);
            button.setOnClickListener(mStartListener);
            button = (Button)findViewById(R.id.stop);
            button.setOnClickListener(mStopListener);
        }

        private OnClickListener mStartListener = new OnClickListener() {
            public void onClick(View v) {
                // Make sure the service is started.  It will continue running
                // until someone calls stopService().
                // We use an action code here, instead of explictly supplying
                // the component name, so that other packages can replace
                // the service.
                startService(new Intent(
                        "com.example.android.apis.app.REMOTE_SERVICE"));
            }
        };

        private OnClickListener mStopListener = new OnClickListener() {
            public void onClick(View v) {
                // Cancel a previous call to startService().  Note that the
                // service will not actually stop at this point if there are
                // still bound clients.
                stopService(new Intent(
                        "com.example.android.apis.app.REMOTE_SERVICE"));
            }
        };
    }
    
    // ----------------------------------------------------------------------
    
    /**
     * Example of binding and unbinding to the remote service.
     * This demonstrates the implementation of a service which the client will
     * bind to, interacting with it through an aidl interface.</p>
     * 
     * <p>Note that this is implemented as an inner class only keep the sample
     * all together; typically this code would appear in some separate class.
     */

    public static class Binding extends Activity {
        /** The primary interface we will be calling on the service. */
        IRemoteService mService = null;
        /** Another interface we use on the service. */
        ISecondary mSecondaryService = null;
        
        Button mKillButton;
        TextView mCallbackText;

        private boolean mIsBound;

        /**
         * Standard initialization of this activity.  Set up the UI, then wait
         * for the user to poke it before doing anything.
         */
        @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);

            setContentView(R.layout.remote_service_binding);

            // Watch for button clicks.
            Button button = (Button)findViewById(R.id.bind);
            button.setOnClickListener(mBindListener);
            button = (Button)findViewById(R.id.unbind);
            button.setOnClickListener(mUnbindListener);
            mKillButton = (Button)findViewById(R.id.kill);
            mKillButton.setOnClickListener(mKillListener);
            mKillButton.setEnabled(false);
            
            mCallbackText = (TextView)findViewById(R.id.callback);
            mCallbackText.setText("Not attached.");
        }

        /**
         * Class for interacting with the main interface of the service.
         */
        private ServiceConnection mConnection = new ServiceConnection() {
            public void onServiceConnected(ComponentName className,
                    IBinder service) {
                // This is called when the connection with the service has been
                // established, giving us the service object we can use to
                // interact with the service.  We are communicating with our
                // service through an IDL interface, so get a client-side
                // representation of that from the raw service object.
                mService = IRemoteService.Stub.asInterface(service);
                mKillButton.setEnabled(true);
                mCallbackText.setText("Attached.");

                // We want to monitor the service for as long as we are
                // connected to it.
                try {
                    mService.registerCallback(mCallback);
                } catch (RemoteException e) {
                    // In this case the service has crashed before we could even
                    // do anything with it; we can count on soon being
                    // disconnected (and then reconnected if it can be restarted)
                    // so there is no need to do anything here.
                }
                
                // As part of the sample, tell the user what happened.
                Toast.makeText(Binding.this, R.string.remote_service_connected,
                        Toast.LENGTH_SHORT).show();
            }

            public void onServiceDisconnected(ComponentName className) {
                // This is called when the connection with the service has been
                // unexpectedly disconnected -- that is, its process crashed.
                mService = null;
                mKillButton.setEnabled(false);
                mCallbackText.setText("Disconnected.");

                // As part of the sample, tell the user what happened.
                Toast.makeText(Binding.this, R.string.remote_service_disconnected,
                        Toast.LENGTH_SHORT).show();
            }
        };

        /**
         * Class for interacting with the secondary interface of the service.
         */
        private ServiceConnection mSecondaryConnection = new ServiceConnection() {
            public void onServiceConnected(ComponentName className,
                    IBinder service) {
                // Connecting to a secondary interface is the same as any
                // other interface.
                mSecondaryService = ISecondary.Stub.asInterface(service);
                mKillButton.setEnabled(true);
            }

            public void onServiceDisconnected(ComponentName className) {
                mSecondaryService = null;
                mKillButton.setEnabled(false);
            }
        };

        private OnClickListener mBindListener = new OnClickListener() {
            public void onClick(View v) {
                // Establish a couple connections with the service, binding
                // by interface names.  This allows other applications to be
                // installed that replace the remote service by implementing
                // the same interface.
                bindService(new Intent(IRemoteService.class.getName()),
                        mConnection, Context.BIND_AUTO_CREATE);
                bindService(new Intent(ISecondary.class.getName()),
                        mSecondaryConnection, Context.BIND_AUTO_CREATE);
                mIsBound = true;
                mCallbackText.setText("Binding.");
            }
        };

        private OnClickListener mUnbindListener = new OnClickListener() {
            public void onClick(View v) {
                if (mIsBound) {
                    // If we have received the service, and hence registered with
                    // it, then now is the time to unregister.
                    if (mService != null) {
                        try {
                            mService.unregisterCallback(mCallback);
                        } catch (RemoteException e) {
                            // There is nothing special we need to do if the service
                            // has crashed.
                        }
                    }
                    
                    // Detach our existing connection.
                    unbindService(mConnection);
                    unbindService(mSecondaryConnection);
                    mKillButton.setEnabled(false);
                    mIsBound = false;
                    mCallbackText.setText("Unbinding.");
                }
            }
        };

        private OnClickListener mKillListener = new OnClickListener() {
            public void onClick(View v) {
                // To kill the process hosting our service, we need to know its
                // PID.  Conveniently our service has a call that will return
                // to us that information.
                if (mSecondaryService != null) {
                    try {
                        int pid = mSecondaryService.getPid();
                        // Note that, though this API allows us to request to
                        // kill any process based on its PID, the kernel will
                        // still impose standard restrictions on which PIDs you
                        // are actually able to kill.  Typically this means only
                        // the process running your application and any additional
                        // processes created by that app as shown here; packages
                        // sharing a common UID will also be able to kill each
                        // other's processes.
                        Process.killProcess(pid);
                        mCallbackText.setText("Killed service process.");
                    } catch (RemoteException ex) {
                        // Recover gracefully from the process hosting the
                        // server dying.
                        // Just for purposes of the sample, put up a notification.
                        Toast.makeText(Binding.this,
                                R.string.remote_call_failed,
                                Toast.LENGTH_SHORT).show();
                    }
                }
            }
        };
        
        // ----------------------------------------------------------------------
        // Code showing how to deal with callbacks.
        // ----------------------------------------------------------------------
        
        /**
         * This implementation is used to receive callbacks from the remote
         * service.
         */
        private IRemoteServiceCallback mCallback = new IRemoteServiceCallback.Stub() {
            /**
             * This is called by the remote service regularly to tell us about
             * new values.  Note that IPC calls are dispatched through a thread
             * pool running in each process, so the code executing here will
             * NOT be running in our main thread like most other things -- so,
             * to update the UI, we need to use a Handler to hop over there.
             */
            public void valueChanged(int value) {
                mHandler.sendMessage(mHandler.obtainMessage(BUMP_MSG, value, 0));
            }
        };
        
        private static final int BUMP_MSG = 1;
        
        private Handler mHandler = new Handler() {
            @Override public void handleMessage(Message msg) {
                switch (msg.what) {
                    case BUMP_MSG:
                        mCallbackText.setText("Received from service: " + msg.arg1);
                        break;
                    default:
                        super.handleMessage(msg);
                }
            }
            
        };
    }


    // ----------------------------------------------------------------------

    /**
     * Examples of behavior of different bind flags.</p>
     */

    public static class BindingOptions extends Activity {
        ServiceConnection mCurConnection;
        TextView mCallbackText;

        class MyServiceConnection implements ServiceConnection {
            final boolean mUnbindOnDisconnect;

            public MyServiceConnection() {
                mUnbindOnDisconnect = false;
            }

            public MyServiceConnection(boolean unbindOnDisconnect) {
                mUnbindOnDisconnect = unbindOnDisconnect;
            }

            public void onServiceConnected(ComponentName className,
                    IBinder service) {
                if (mCurConnection != this) {
                    return;
                }
                mCallbackText.setText("Attached.");
                Toast.makeText(BindingOptions.this, R.string.remote_service_connected,
                        Toast.LENGTH_SHORT).show();
            }

            public void onServiceDisconnected(ComponentName className) {
                if (mCurConnection != this) {
                    return;
                }
                mCallbackText.setText("Disconnected.");
                Toast.makeText(BindingOptions.this, R.string.remote_service_disconnected,
                        Toast.LENGTH_SHORT).show();
                if (mUnbindOnDisconnect) {
                    unbindService(this);
                    mCurConnection = null;
                    Toast.makeText(BindingOptions.this, R.string.remote_service_unbind_disconn,
                            Toast.LENGTH_SHORT).show();
                }
            }
        }

        /**
         * Standard initialization of this activity.  Set up the UI, then wait
         * for the user to poke it before doing anything.
         */
        @Override
        protected void onCreate(Bundle savedInstanceState) {
            super.onCreate(savedInstanceState);

            setContentView(R.layout.remote_binding_options);

            // Watch for button clicks.
            Button button = (Button)findViewById(R.id.bind_normal);
            button.setOnClickListener(mBindNormalListener);
            button = (Button)findViewById(R.id.bind_not_foreground);
            button.setOnClickListener(mBindNotForegroundListener);
            button = (Button)findViewById(R.id.bind_above_client);
            button.setOnClickListener(mBindAboveClientListener);
            button = (Button)findViewById(R.id.bind_allow_oom);
            button.setOnClickListener(mBindAllowOomListener);
            button = (Button)findViewById(R.id.bind_waive_priority);
            button.setOnClickListener(mBindWaivePriorityListener);
            button = (Button)findViewById(R.id.bind_important);
            button.setOnClickListener(mBindImportantListener);
            button = (Button)findViewById(R.id.bind_with_activity);
            button.setOnClickListener(mBindWithActivityListener);
            button = (Button)findViewById(R.id.unbind);
            button.setOnClickListener(mUnbindListener);

            mCallbackText = (TextView)findViewById(R.id.callback);
            mCallbackText.setText("Not attached.");
        }

        private OnClickListener mBindNormalListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection();
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mBindNotForegroundListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection();
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE | Context.BIND_NOT_FOREGROUND)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mBindAboveClientListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection();
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE | Context.BIND_ABOVE_CLIENT)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mBindAllowOomListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection();
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE | Context.BIND_ALLOW_OOM_MANAGEMENT)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mBindWaivePriorityListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection(true);
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE | Context.BIND_WAIVE_PRIORITY)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mBindImportantListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection();
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE | Context.BIND_IMPORTANT)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mBindWithActivityListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
                ServiceConnection conn = new MyServiceConnection();
                if (bindService(new Intent(IRemoteService.class.getName()),
                        conn, Context.BIND_AUTO_CREATE | Context.BIND_ADJUST_WITH_ACTIVITY
                        | Context.BIND_WAIVE_PRIORITY)) {
                    mCurConnection = conn;
                }
            }
        };

        private OnClickListener mUnbindListener = new OnClickListener() {
            public void onClick(View v) {
                if (mCurConnection != null) {
                    unbindService(mCurConnection);
                    mCurConnection = null;
                }
            }
        };
    }
}
