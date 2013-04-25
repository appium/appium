package io.appium.android.adb;

import java.io.IOException;
import java.util.Map;

import org.eclipse.swt.graphics.ImageData;
import org.eclipse.swt.graphics.PaletteData;

import com.android.ddmlib.AdbCommandRejectedException;
import com.android.ddmlib.IDevice;
import com.android.ddmlib.IDevice.DeviceState;
import com.android.ddmlib.RawImage;
import com.android.ddmlib.TimeoutException;

public class Device {
  private final IDevice device;

  public Device(final IDevice device) {
    this.device = device;
  }

  public String getAvdName() {
    return device.getAvdName();
  }

  public Map<String, String> getProperties() {
    return device.getProperties();
  }

  public String getProperty(final String prop) {
    return device.getProperty(prop);
  }

  public int getPropertyCount() {
    return device.getPropertyCount();
  }

  public ImageData getScreenshot() throws TimeoutException,
      AdbCommandRejectedException, IOException {
    final RawImage img = device.getScreenshot();
    final PaletteData pdata = new PaletteData(img.getRedMask(),
        img.getGreenMask(), img.getBlueMask());
    final ImageData imgData = new ImageData(img.width, img.height, img.bpp,
        pdata, 1, img.data);

    return imgData;
  }

  public String getSerialNumber() {
    return device.getSerialNumber();
  }

  public DeviceState getState() {
    return device.getState();
  }

  public boolean isEmulator() {
    return device.isEmulator();
  }

  public boolean isOffline() {
    return device.isOffline();
  }

  public boolean isOnline() {
    return device.isOnline();
  }

  @Override
  public String toString() {
    return getSerialNumber();
  }
}
