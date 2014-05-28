package com.example.toggletest;

import android.location.LocationManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.telephony.TelephonyManager;
import android.widget.ToggleButton;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.Context;

public class MainActivity extends Activity {
	private ToggleButton mWifiToggle;
	private ToggleButton mDataToggle;
	private ToggleButton mFlightModeToggle;
	private ToggleButton mGPSToggle;
	private WifiManager mWifiManager;
	private TelephonyManager mTelephonyManager;
	private LocationManager mLocationManager;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_main);
		
		mWifiManager = (WifiManager)getSystemService(Context.WIFI_SERVICE);
		mTelephonyManager = (TelephonyManager)getSystemService(Context.TELEPHONY_SERVICE);
		mLocationManager = (LocationManager)getSystemService(Context.LOCATION_SERVICE);
		
		mWifiToggle = (ToggleButton)findViewById(R.id.wifi_toggle);
		mDataToggle = (ToggleButton)findViewById(R.id.data_toggle);
		mFlightModeToggle = (ToggleButton)findViewById(R.id.flight_toggle);
		mGPSToggle = (ToggleButton)findViewById(R.id.gps_toggle);	
	}

	@Override
	protected void onResume() {
		super.onResume();

		mWifiToggle.setChecked(mWifiManager.isWifiEnabled());
		mDataToggle.setChecked(mTelephonyManager.getDataState() == TelephonyManager.DATA_CONNECTED);
		mFlightModeToggle.setChecked(FlightMode.getInstance().isEnabled(this));
		mGPSToggle.setChecked(mLocationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
				|| mLocationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
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
