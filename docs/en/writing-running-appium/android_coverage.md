# Android Coverage Guide
## Requirement
* Only Emulators or rooted phones are acceptable
* Need to add UiAutomator2 support in your apps. That is to say, you need to implement a subclass of `Instrumentation`. `Instrumentation` will be responsible to collect your coverage. 
* Need to implement a BroadcastReceiver to export coverage to disk files. This is because `Instrumentation` only collects data into memory.

## Project Structure
You may need the following structure of files:
```
src/main/java/com/example/pkg
   |____ MainActivity.java    Your main activity
   |____ InstrumentActivityListener.java     A customized interface for exporting coverage to files
   |____ InstrumentActivity.java    Activity launched for coverage. But in most cases, this should be same as MainActivity. The only difference is that it will include a `InstrumentActivityListener` to export coverage data to disk files.
   |____ JacocoInstrumentation.java    The instrument class created by you. Also it needs to implement `InstrumentActivitylistener`.
   |____ EndEmmaBroadCast.java    A broadcast receiver which will be invoked by appium-uiautomator2-driver at the end of testing. You need implementing logic to invoke InstrumentActivityListener so as to export coverage to files.
```
Configure followings in your caps:  
 * automationName ： `uiautomator2` (case irrelevant)  
 * androidCoverage ： {package}/{instrumentation class}, in our example, `com.example.pkg/com.example.pkg.JacocoInstrumentation`  
 * appWaitActivity ： the FQCN of the activity of InstrumentActivity, in our example, `com.example.pkg.InstrumentActivity`  
 * appWaitPackage ： {package}，in our example, `com.example.pkg`  
 `androidCoverageEndIntent` ： The action of the broadcast receiver to invoke the exporting of coverage data to files, in our example `com.example.pkg.END_EMMA`  

Methodology  
 Appium (appium-uiautomator2-driver) will launch app via command like：`adb shell am instrument -e coverage true -w com.example.pkg/com.example.pkg.JacocoInstrumentation`  
 After testing is done, Appium (appium-uiautomator2-driver) will execute `adb shell am broadcast -a com.example.pkg.END_EMMA` to export coverage to files（If you implement such export in the broadcast receiver）

## Example
### [1] Appium Testing Project - Configure Caps
Please refer to ** "Project Structure" ->  "Configure followings in your caps" **

### [2] Android Project

Define instrumentation class and broadcast receiver in `AndroidManifest.xml`:

```xml
    <instrumentation
        android:name="com.example.pkg.instrumentation.JacocoInstrumentation"
        android:targetPackage="com.example.pkg" >
    </instrumentation>

    <!-- adb shell am broadcast -a com.example.pkg.END_EMMA -->
    <receiver android:name="com.example.pkg.EndEmmaBroadcast" >
       <intent-filter>
           <action android:name="com.example.pkg.END_EMMA" />
       </intent-filter>
    </receiver>
```

Then, `EndEmmaBroadcast.java` ：

```java
package com.example.pkg;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Process;

// adb shell am broadcast -a com.example.pkg.END_EMMA
public class EndEmmaBroadcast extends BroadcastReceiver {
    InstrumentActivityListener activityListener;

    public void setInstrumentActivityListener(InstrumentActivityListener listener){
        this.activityListener = listener;
    }
    @Override
    public void onReceive(Context context, Intent intent) {
        if(this.activityListener!=null){
          activityListener.onActivityEnd();
        }
        // once coverage is dumped, the processes is ended.
        Process.killProcess(Process.myPid());
    }
}
```

After that, `JacocoInstrumentation.java`：

```java
package com.example.pkg;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.os.Looper;
import android.util.Log;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

public class JacocoInstrumentation  extends Instrumentation implements InstrumentActivityListener {
    public static String TAG = "JacocoInstrumentation:";
    private static String DEFAULT_COVERAGE_FILE_PATH = null;
    private final Bundle mResults = new Bundle();
    private Intent mIntent;
    private static final boolean LOGD = true;
    private boolean mCoverage = true;
    private String mCoverageFilePath;

    public JacocoInstrumentation() {
    }
    @Override
    public void onCreate(Bundle arguments) {
        Log.d(TAG, "onCreate(" + arguments + ")");
        super.onCreate(arguments);
        // bad notation, better use NAME+TimeSeed because you might generate more than 1 corage file
        DEFAULT_COVERAGE_FILE_PATH = getContext().getFilesDir().getPath().toString() + "/coverage.ec";
        File file = new File(DEFAULT_COVERAGE_FILE_PATH);
        if(!file.exists()){
            try{
                file.createNewFile();
            }catch (IOException e){
                Log.d(TAG,"File Exception ："+e);
                e.printStackTrace();}
        }
        if(arguments != null) {
            mCoverageFilePath = arguments.getString("coverageFile");
        }
        mIntent = new Intent(getTargetContext(), InstrumentActivity.class);
        mIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        start();
    }
    @Override
    public void onStart() {
        super.onStart();
        Looper.prepare();
        // Register broadcast receiver and start InstrumentActivity
        InstrumentActivity activity = (InstrumentActivity) startActivitySync(mIntent);
        EndEmmaBroadcast broadcast = new EndEmmaBroadcast();
        activity.setInstrumentActivityListener(this);
        broadcast.setInstrumentActivityListener(this);
        activity.registerReceiver(broadcast, new IntentFilter("com.example.pkg.END_EMMA"));
    }
    private String getCoverageFilePath() {
        if (mCoverageFilePath == null) {
            return DEFAULT_COVERAGE_FILE_PATH;
        } else {
            return mCoverageFilePath;
        }
    }
    private void generateCoverageReport() {
        Log.d(TAG, "generateCoverageReport():" + getCoverageFilePath());
        OutputStream out = null;
        try {
            out = new FileOutputStream(getCoverageFilePath(), false);
            Object agent = Class.forName("org.jacoco.agent.rt.RT")
                    .getMethod("getAgent")
                    .invoke(null);
            out.write((byte[]) agent.getClass().getMethod("getExecutionData", boolean.class)
                    .invoke(agent, false));
        } catch (Exception e) {
            Log.d(TAG, e.toString(), e);
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    public void onActivityEnd() {
        if (LOGD)      Log.d(TAG, "onActivityFinished()");
        if (mCoverage) {
            generateCoverageReport();
        }
        finish(Activity.RESULT_OK, mResults);
    }
}

```

Then, `InstrumentActivityListener.java`
```java
package com.example.pkg;

public interface InstrumentActivityListener {
    void onActivityEnd();
}
```

`InstrumentActivity.java` (This is optional, you can use MainActivity)
```java
package com.example.pkg;
import android.app.Instrumentation;
import android.os.Bundle;
import android.util.Log;


public class InstrumentActivity extends MainActivity {
    public static String TAG = "IntrumentedActivity";
    private InstrumentActivityListener listener;

    public void setInstrumentActivityListener(InstrumentActivityListener listener) {
        this.listener = listener;
    }

    // Generate output report when the activity is destroyed
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy()");
        super.finish();
        if (listener != null) {
            listener.onActivityEnd();
        }
    }
}
```

Finally, the most important part is `gradle`:
```groovy
....


apply plugin: 'jacoco' // add plugin for jacoco

...

android {
    ...
    defaultConfig {
        ...
        testInstrumentationRunner "android.support.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            ...
        }
        debug{
            testCoverageEnabled = true
        }
    }
}

dependencies {
    ...
    //uiautomator
    androidTestCompile 'com.android.support.test.uiautomator:uiautomator-v18:2.1.0'
}

```


### [3] Now, build apk and run Appium tests!
The coverage.ec will be generated at /data/data/com.example.pkg/files. Pull it out.

### [4] About generating HTML reports
To get the HTML report of coverage.ec, you need following steps:
* [1] pull it into file system by `adb pull` 
* [2] create the following task in your gradle file:
```groovy
def coverageSourceDirs = [
        './src/main/java'
]

task jacocoTestReport(type: JacocoReport) {
    group = "Reporting"
    description = "Generate Jacoco coverage reports after running tests."
    reports {
        xml.enabled = true
        html.enabled = true
    }
    classDirectories = fileTree(
            dir: './build/intermediates/classes/debug',
            excludes: ['**/R*.class',
                       '**/*$InjectAdapter.class',
                       '**/*$ModuleAdapter.class',
                       '**/*$ViewInjector*.class'
            ])
    sourceDirectories = files(coverageSourceDirs)
    // NOTE: Put your ec file here
    executionData = files("SOME PATH/coverage.ec")

    doFirst {
        new File("$buildDir/intermediates/classes/").eachFileRecurse { file ->
            if (file.name.contains('$$')) {
                file.renameTo(file.path.replace('$$', '$'))
            }
        }
    }
}
```