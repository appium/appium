## Intel® Hardware Accelerated Execution Manager

If you find the android emulator a slow and your system runs on an Intel®
cpu, you can check out HAXM. HAXM lets you leverage your hardware for
virtualization, accelerating the emulator.

* To install HAXM open the Android SDK Manager, you will find the package
  under Extras.
* You can find all relevant documentation on [Intel's website][1]
* This will require an x86 emulator image
* Use Intel's package to install HAXM; The Android SDK Manager appears to not
  do so successfully, depending on the version you might have installed

[1]: http://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager/
