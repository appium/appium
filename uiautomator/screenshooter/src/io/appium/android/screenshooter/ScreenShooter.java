package io.appium.android.screenshooter;

import io.appium.android.adb.AdbHelper;
import io.appium.android.adb.Device;

import java.io.File;
import java.io.IOException;

import org.eclipse.swt.SWT;
import org.eclipse.swt.graphics.ImageData;
import org.eclipse.swt.graphics.ImageLoader;

import com.android.ddmlib.AdbCommandRejectedException;
import com.android.ddmlib.TimeoutException;

/**
 * This handler is used to swipe.
 * 
 * @author <a href="https://github.com/xuru">xuru</a>
 * 
 */
public class ScreenShooter {
  public static void main(final String[] args) throws Exception {

    if (args.length != 2) {
      System.out
          .println("Usage: java -jar ScreenShooter.jar <serial number> <screenshot path>");
      System.exit(1);
    }

    final AdbHelper adbHelper = new AdbHelper();
    final Device device = adbHelper.getDevice(args[0]);

    Logger.info("Creating screenshot:");
    if (device.isEmulator() == true) {
      Logger.info("  AVD: " + device.getAvdName());
    }
    Logger.info("  State: " + device.getState().toString());
    try {
      takeScreenshot(device, args[1]);
      Logger.info("Created screenshot: " + args[1]);
    } catch (final TimeoutException e) {
      Logger.error("Timed out taking screenshot: " + e.getMessage());
    } catch (final AdbCommandRejectedException e) {
      Logger.error("Adb error taking screenshot: " + e.getMessage());
    } catch (final IOException e) {
      Logger.error("IO error taking screenshot: " + e.getMessage());
    } catch (final Exception e) {
      Logger.error(e.getMessage());
    } finally {
      adbHelper.close();
    }
  }

  public static void takeScreenshot(final Device device, final String fileName)
      throws TimeoutException, AdbCommandRejectedException, IOException {
    final ImageData imageData = device.getScreenshot();
    final ImageLoader loader = new ImageLoader();
    loader.data = new ImageData[] { imageData };
    loader.save(new File(fileName).getAbsolutePath(), SWT.IMAGE_PNG);
  }
}
