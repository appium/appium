import { DoctorCheck } from './doctor';
import { ok, nok, okOptional, nokOptional, resolveExecutablePath } from './utils';
import { system, fs } from 'appium-support';
import path from 'path';
import EnvVarAndPathCheck from './env';
import 'colors';
import { getAndroidBinaryPath, getSdkRootFromEnv } from 'appium-adb';
import log from './logger';

let checks = [];

const javaHome = system.isWindows() ? '%JAVA_HOME%' : '$JAVA_HOME';

checks.push(new EnvVarAndPathCheck('ANDROID_HOME'));
checks.push(new EnvVarAndPathCheck('JAVA_HOME'));

// Check that the PATH includes the jdk's bin directory
class JavaOnPathCheck extends DoctorCheck {
  async diagnose () {
    if (process.env.JAVA_HOME) {
      const javaHomeBin = path.resolve(process.env.JAVA_HOME, 'bin');
      return await fs.exists(javaHomeBin)
        ? ok(`'bin' subfolder exists under '${process.env.JAVA_HOME}'`)
        : nok(`'bin' subfolder does not exist under '${process.env.JAVA_HOME}'. ` +
              `Is ${javaHome} set to a proper value?`);
    }
    return nok(`Cannot check ${javaHome} requirements since the environment variable itself is not set`);
  }

  fix () {
    return `Set ${javaHome} environment variable to the root folder path of your local JDK installation`;
  }
}

// Check tools
class AndroidToolCheck extends DoctorCheck {
  constructor () {
    super();
    this.tools = ['adb', 'android', 'emulator'];
    this.noBinaries = [];
  }

  async diagnose () {
    const listOfTools = this.tools.join(', ');
    const sdkRoot = getSdkRootFromEnv();
    if (!sdkRoot) {
      return nok(`${listOfTools} could not be found because ANDROID_HOME or ANDROID_SDK_ROOT is NOT set!`);
    }

    log.info(`   Checking ${listOfTools}`);

    for (const binary of this.tools) {
      try {
        log.info(`     '${binary}' is in ${await getAndroidBinaryPath(binary)}`);
      } catch (e) {
        this.noBinaries.push(binary);
      }
    }

    if (this.noBinaries.length > 0) {
      return nok(`${this.noBinaries.join(', ')} could NOT be found in ${sdkRoot}!`);
    }

    return ok(`${listOfTools} exist: ${sdkRoot}`);
  }

  fix () {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return `Manually configure ${'ANDROID_HOME'.bold} and run appium-doctor again.`;
    }

    return `Manually install ${this.noBinaries.join(', ').bold} and add it to ${'PATH'.bold}. ` +
      'https://developer.android.com/studio#cmdline-tools and ' +
      'https://developer.android.com/studio/intro/update#sdk-manager may help to setup.';
  }
}
checks.push(new AndroidToolCheck());
checks.push(new JavaOnPathCheck());

class OptionalAppBundleCheck extends DoctorCheck {
  async diagnose () {
    const bundletoolPath = await resolveExecutablePath('bundletool.jar');
    return bundletoolPath
      ? okOptional(`bundletool.jar is installed at: ${bundletoolPath}`)
      : nokOptional('bundletool.jar cannot be found');
  }

  async fix () { // eslint-disable-line require-await
    return `${'bundletool.jar'.bold} is used to handle Android App Bundle. Please read http://appium.io/docs/en/writing-running-appium/android/android-appbundle/ to install it` +
      `${system.isWindows() ? '. Also consider adding the ".jar" extension into your PATHEXT environment variable in order to fix the problem for Windows' : ''}`;
  }
}
checks.push(new OptionalAppBundleCheck());

class OptionalGstreamerCheck extends DoctorCheck {
  GSTREAMER_BINARY = `gst-launch-1.0${system.isWindows() ? '.exe' : ''}`;
  GST_INSPECT_BINARY = `gst-inspect-1.0${system.isWindows() ? '.exe' : ''}`;

  async diagnose () {
    const gstreamerPath = await resolveExecutablePath(this.GSTREAMER_BINARY);
    const gstInspectPath = await resolveExecutablePath(this.GST_INSPECT_BINARY);

    return gstreamerPath && gstInspectPath
      ? okOptional(`${this.GSTREAMER_BINARY} and ${this.GST_INSPECT_BINARY} are installed at: ${gstreamerPath} and ${gstInspectPath}`)
      : nokOptional(`${this.GSTREAMER_BINARY} and/or ${this.GST_INSPECT_BINARY} cannot be found`);
  }

  async fix () { // eslint-disable-line require-await
    return `${`${this.GSTREAMER_BINARY} and ${this.GST_INSPECT_BINARY}`.bold} are used to stream the screen of the device under test. ` +
      'Please read https://appium.io/docs/en/writing-running-appium/android/android-screen-streaming/ to install them and for more details';
  }
}
checks.push(new OptionalGstreamerCheck());

export { EnvVarAndPathCheck, AndroidToolCheck, JavaOnPathCheck, OptionalAppBundleCheck, OptionalGstreamerCheck };
export default checks;
