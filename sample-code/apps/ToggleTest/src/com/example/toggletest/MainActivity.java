package com.example.toggletest;

import android.annotation.TargetApi;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.LocationManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.provider.Settings.SettingNotFoundException;
import android.telephony.TelephonyManager;
import android.util.Log;
import android.widget.ToggleButton;


public class MainActivity extends Activity {
	private static final String TAG = "Toggle Test";
	private ToggleButton mWifiToggle;
	private ToggleButton mDataToggle;
	private ToggleButton mFlightModeToggle;
	private ToggleButton mGPSToggle;
	private TelephonyManager mTelephonyManager;
	private LocationManager mLocationManager;
	private NetworkReceiver receiver;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);

		mTelephonyManager = (TelephonyManager)getSystemService(Context.TELEPHONY_SERVICE);
		mLocationManager = (LocationManager)getSystemService(Context.LOCATION_SERVICE);

		mWifiToggle = (ToggleButton)findViewById(R.id.wifi_toggle);
		mDataToggle = (ToggleButton)findViewById(R.id.data_toggle);
		mFlightModeToggle = (ToggleButton)findViewById(R.id.flight_toggle);
		mGPSToggle = (ToggleButton)findViewById(R.id.gps_toggle);
	}

	@Override
	protected void onPause() {
		super.onPause();
		this.unregisterReceiver(receiver);
	}

	@Override
	protected void onResume() {
		super.onResume();
		this.addReceiver();
		this.refresh();
	}

	private void addReceiver() {
		IntentFilter filters = new IntentFilter();
    filters.addAction(WifiManager.WIFI_STATE_CHANGED_ACTION);
    filters.addAction(WifiManager.NETWORK_STATE_CHANGED_ACTION);
    filters.addAction("android.intent.action.ANY_DATA_STATE");
    filters.addAction(Intent.ACTION_AIRPLANE_MODE_CHANGED);

    this.receiver = new NetworkReceiver(this);
    registerReceiver(this.receiver, filters);
	}

	protected void refresh() {
		try {
			// the WifiManager is flakey on emulators
			// it is faster and more reliable to get the read-only setting for wifi_on
			int wifiOn = Settings.Global.getInt(getContentResolver(), Settings.Global.WIFI_ON);
			mWifiToggle.setChecked(wifiOn != 0);
		} catch (SettingNotFoundException e) {
			// fall through
			Log.d(TAG, "Unable to find Setting 'wifi_on': " + e.getMessage());
		}
		try {
			int dataOn = Settings.Global.getInt(getContentResolver(), "mobile_data");
			mDataToggle.setChecked(dataOn != 0);
		} catch (SettingNotFoundException e) {
			Log.d(TAG, "Unable to find Setting 'mobile_data': " + e.getMessage());
		}
		boolean fMode = FlightMode.getInstance().isEnabled(this);
		mFlightModeToggle.setChecked(fMode);
		if (fMode) {
			// data in particular sometimes still says it's on when there is airplane mode
			mWifiToggle.setChecked(false);
			mDataToggle.setChecked(false);
		}
		mGPSToggle.setChecked(mLocationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
				|| mLocationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
	}

	static class NetworkReceiver extends BroadcastReceiver {
		private MainActivity activity;

		public NetworkReceiver(MainActivity activity) {
			this.activity = activity;
		}

		@Override
		public void onReceive(Context context, Intent intent) {
			activity.refresh();
		}
	}

	static class FlightMode {
		public static FlightMode getInstance() {
			if(Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR1) {
				return new FlightMode();
			} else {
				return new FlightModeJBMR1();
			}
		}

		public boolean isEnabled(Context context) {
			return Settings.System.getInt(context.getContentResolver(),
					Settings.System.AIRPLANE_MODE_ON, 0) != 0;
		}
	}

	@TargetApi(Build.VERSION_CODES.JELLY_BEAN_MR1)
	static class FlightModeJBMR1 extends FlightMode {
		@Override
		public boolean isEnabled(Context context) {
			return Settings.Global.getInt(context.getContentResolver(),
					Settings.Global.AIRPLANE_MODE_ON, 0) != 0;
		}
	}
}
