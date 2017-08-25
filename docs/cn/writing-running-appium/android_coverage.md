# Android Coverage Guide
## 要求
* 硬件要求：Android 覆盖率需要使用模拟器或者 root 过的机器。
* 你需要使用UiAutomator2构建你的应用。也就是说，你要在你的Android项目中实现Instrumentation的子类。Instrumentation将实现对代码覆盖情况的收集。
* 由于Instrumentation的数据存在于内存中，因此你还需要实现一个BroadCastReceiver，用于在Instrumentation结束时将Instrument结果输出到手机存储器的文件中。

## 项目结构
你的项目需要看起来类似如下的结构
```
src/main/java/com/example/pkg
   |____ MainActivity.java 你的主Activity
   |____ InstrumentActivityListener.java 自定义的用于实现覆盖率导出到文件的接口
   |____ InstrumentActivity.java 专门用于覆盖率调试的Activity，你也可以直接用MainActivity。它将包含一个InstrumentActivityListener，并且在Activity结束时调用这个Listener以导出覆盖率。你在调试时可以使用
   |____ JacocoInstrumentation.java  你自己的Instrumentation文件，必须实现InstrumentActivityListener
   |____ EndEmmaBroadCast.java 用于接受结束信号广播的接收器，它将调用InstrumentActivityListener并导出覆盖率。
```

你在配置Caps时要做如下设置  
 * automationName ： `uiautomator2` (无视大小写)  
 * androidCoverage ： {package}/{instrumentation class}, 在我们的例子中是com.example.pkg/com.example.pkg.JacocoInstrumentation  
 * appWaitActivity ： 用作Insutrment的Activity的全名，在我们的例子中是com.example.pkg.InstrumentActivity
 * appWaitPackage ： {package}，在我们的例子中是com.example.pkg  
 * androidCoverageEndIntent ： 用作将当前coverage输出至文件中的BroadCasterReceiver的Action名，在我们的例子中是 `com.example.pkg.END_EMMA`  

工作原理  
 Appium 会用类似的命令启动应用：`adb shell am instrument -e coverage true -w com.example.pkg/com.example.pkg.JacocoInstrumentation`  
 在测试完成后，会用`adb shell am broadcast -a com.example.pkg.END_EMMA` 使覆盖率可以被收集（前提是你亲自实现它）

## 例子：实现流程
### [1] Appium测试项目 - 设置Caps
请参考 **『项目结构』 -> 『你在配置Caps时要做如下设置』**

### [2] Android项目 - AndroidManifest.xml

在 `AndroidManifest.xml` 里定义 instrumentation 和 broadcast 接收器。

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

接下来，编写 `EndEmmaBroadcast.java` ：

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

之后，编写 `JacocoInstrumentation.java`：

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

之后是`InstrumentActivityListener.java`
```java
package com.example.pkg;

public interface InstrumentActivityListener {
    void onActivityEnd();
}
```

可选的 `InstrumentActivity.java`
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

最后，最重要的是`gradle`:
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


### [3] 现在，你可以构建apk，并拿来跑你的自动测试吧！！
测试完成后，就会在/data/data/com.example.pkg/files中生成coverage.ec文件，将其pull出。

### [4] 关于拉出HTML报告
当你跑完测试后，程序会在你手机的app里产生coverage.ec这样的文件。
* [1] 首先，利用adb pull把coverage.ec拉出手机
* [2] 关于如何把ec转化成HTML，你可以在gradle里加入下列task：
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