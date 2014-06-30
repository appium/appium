@echo off

:: Go to directory containing batch file
FOR /f %%i in ("%0") DO SET curpath=%%~dpi
CD /d %curpath%

:: Flags to determine which parts will be executed
SET doDev=0
SET doSelendroid=0
SET doAndroid=0
SET doVerbose=0
SET doForce=0
SET pigsFly=0
SET chromedriver_version=
SET udid=

:: Read in command line switches
:loop
IF "%~1" neq "" (
  IF "%1" == "--dev" SET doDev=1
  IF "%1" == "--android" SET doAndroid=1
  IF "%1" == "--selendroid" SET doSelendroid=1
  IF "%1" == "--verbose" SET doVerbose=1
  IF "%1" == "--force" SET doForce=1
  IF "%1" == "--chromedriver-version" IF "%2" neq "" (
    SET "chromedriver_version=%2"
  )
  IF "%1" == "--udid" IF "%2" neq "" (
    SET "udid=%2"
  )
  shift
  goto :loop
)

:: If nothing is flagged do only android
IF %doDev% == 0 IF %doSelendroid% == 0 IF %doAndroid% == 0 SET doAndroid=1

:: Install Package and Dependencies
ECHO.
ECHO =====Installing dependencies with npm=====
ECHO.
CALL :runCmd "npm install ."
ECHO =====Finished installing dependencies with npm=====
ECHO.

:: Install Dev Dependencies
if %doDev% == 1 (
  ECHO.
  ECHO =====Installing development dependencies with npm=====
  ECHO.
  CALL :runCmd "npm install . --dev"
  ECHO =====Finished installing development dependencies with npm=====
  ECHO.
)

:: Reset Android
if %doAndroid% == 1 (
  ECHO.
  ECHO =====Resetting Android=====
  ECHO.
  CALL :runCmd "node_modules\.bin\grunt configAndroidBootstrap"
  CALL :runCmd "node_modules\.bin\grunt buildAndroidBootstrap"
  CALL :runCmd "node_modules\.bin\grunt setConfigVer:android"
  ECHO.
  ECHO =====Reset Android Complete=====

  ECHO.
  ECHO =====Resetting Unlock.apk=====
  ECHO.
  CALL :runCmd "RD /S /Q build\unlock_apk | VER > NUL"
  CALL :runCmd "MKDIR build\unlock_apk"
  ECHO Building Unlock.apk
  CALL :runCmd "git submodule update --init submodules\unlock_apk"
  CALL :runCmd "PUSHD submodules\unlock_apk"
  CALL :runCmd "ant clean"
  CALL :runCmd "ant debug"
  CALL :runCmd "POPD"
  CALL :runCmd "COPY submodules\unlock_apk\bin\unlock_apk-debug.apk build\unlock_apk\unlock_apk-debug.apk"
  ECHO.
  ECHO =====Reset Unlock.apk Complete=====

  ECHO.
  ECHO =====Resetting UnicodeIME.apk=====
  ECHO.
  CALL :runCmd "RD /S /Q build\unicode_ime_apk | VER > NUL"
  CALL :runCmd "MKDIR build\unicode_ime_apk"
  ECHO Building UnicodeIME.apk
  CALL :runCmd "git submodule update --init submodules\io.appium.android.ime"
  CALL :runCmd "PUSHD submodules\io.appium.android.ime"
  CALL :runCmd "ant clean"
  CALL :runCmd "ant debug"
  CALL :runCmd "POPD"
  CALL :runCmd "COPY submodules\io.appium.android.ime\bin\UnicodeIME-debug.apk build\unicode_ime_apk\UnicodeIME-debug.apk"
  ECHO.
  ECHO =====Reset UnicodeIME.apk Complete=====

  ECHO.
  ECHO =====Resetting Settings.apk=====
  ECHO.
  CALL :runCmd "RD /S /Q build\settings_apk | VER > NUL"
  CALL :runCmd "MKDIR build\settings_apk"
  ECHO Building Settings.apk
  CALL :runCmd "git submodule update --init submodules\io.appium.settings"
  CALL :runCmd "PUSHD submodules\io.appium.settings"
  CALL :runCmd "ant clean"
  CALL :runCmd "ant debug"
  CALL :runCmd "POPD"
  CALL :runCmd "COPY submodules\io.appium.settings\bin\settings_apk-debug.apk build\settings_apk\settings_apk-debug.apk"
  ECHO.
  ECHO =====Reset Settings.apk Complete=====

  :: Reset Android Dev
  IF %doDev% == 1 (
    ECHO.
    ECHO =====Resetting API Demos=====
    ECHO.
    ECHO Cloning/updating Android test app: ApiDemos
    CALL :runCmd "git submodule update --init submodules\ApiDemos"
    CALL :runCmd "RD /S /Q sample-code\apps\ApiDemos | VER > NUL"
    CALL :runCmd "MKDIR sample-code\apps\ApiDemos"
    CALL :runCmd "XCOPY submodules\ApiDemos sample-code\apps\ApiDemos /E /Q"
    CALL :runCmd "node_modules\.bin\grunt configAndroidApp:ApiDemos"
    CALL :runCmd "node_modules\.bin\grunt buildAndroidApp:ApiDemos"
    ECHO.
    ECHO =====Reset API Demos Complete=====
  )

  :: Reset ChromeDriver
  echo =====Resetting ChromeDriver=====
  setlocal enabledelayedexpansion
  SET "chromedriver_build_directory=.\build\chromedriver\windows"
  echo Building directory structure
  IF NOT EXIST .\build                      CALL :runCmd "mkdir .\build"
  IF NOT EXIST .\build\chromedriver         CALL :runCmd "mkdir .\build\chromedriver"
  IF NOT EXIST .\build\chromedriver\windows CALL :runCmd "mkdir !chromedriver_build_directory!"

  echo Removing old files
  IF EXIST !chromedriver_build_directory!\chromedriver.zip CALL :runCmd "del !chromedriver_build_directory!\chromedriver.zip"
  IF EXIST !chromedriver_build_directory!\chromedriver.exe CALL :runCmd "del !chromedriver_build_directory!\chromedriver.exe"

  IF NOT DEFINED chromedriver_version (
    echo Finding latest version
    for /f "delims=" %%a in ('curl -L http://chromedriver.storage.googleapis.com/LATEST_RELEASE') do SET "chromedriver_version=%%a"
  )

  echo !chromedriver_build_directory!
  echo Downloading and installing version !chromedriver_version!
  CALL :runCmd "curl -L http://chromedriver.storage.googleapis.com/!chromedriver_version!/chromedriver_win32.zip -o !chromedriver_build_directory!\chromedriver.zip"
  CALL :runCmd "PUSHD !chromedriver_build_directory!"
  CALL :runCmd "jar xf chromedriver.zip"
  CALL :runCmd "del chromedriver.zip"
  CALL :runCmd "POPD"

  echo =====Reset ChromeDriver Complete=====
)

:: Reset Selendroid
IF %doSelendroid% == 1 (
  ECHO.
  ECHO =====Resetting Selendroid=====
  ECHO.
  ECHO Clearing out any old modified server apks
  CALL :runCmd "RD -/S /Q %windir%\Temp\selendroid*.apk | VER > NUL"
  ECHO Cloning/updating selendroid
  CALL :runCmd "RD -/S /Q submodules\selendroid\selendroid-server\target | VER > NUL"
  CALL :runCmd "git submodule update --init submodules\selendroid"
  CALL :runCmd "RD /S /Q selendroid | VER > NUL"
  ECHO Building selendroid server and supporting libraries
  CALL :runCmd "set MAVEN_OPTS=-Xms512m -Xmx512m -Xss2048k"
  CALL :runCmd "node_modules\.bin\grunt buildSelendroidServer"
  CALL :runCmd "set MAVEN_OPTS="

  :: Reset Selendroid Dev
  IF %doDev% == 1 (
    ECHO.
    ECHO =====Resetting Selendroid - Dev=====
    ECHO.
    ECHO Linking selendroid test app: WebViewDemo
    CALL :runCmd "RD /S /Q sample-code\apps\WebViewDemo | VER > NUL"
    CALL :runCmd "MKDIR sample-code\apps\WebViewDemo"
    CALL :runCmd "XCOPY submodules\selendroid\selendroid-test-app sample-code\apps\WebViewDemo /E /Q"
    CALL :uninstallAndroidApp io.appium.android.apis.selendroid
    CALL :uninstallAndroidApp io.selendroid.testapp
    CALL :uninstallAndroidApp io.selendroid.testapp.selendroid
    CALL :uninstallAndroidApp org.openqa.selendroid.testapp
    CALL :uninstallAndroidApp openqa.selendroid.testapp.selendroid
    ECHO.
    ECHO =====Reset Selendroid - Dev Complete=====
  )

  ECHO Setting Selendroid config to Appium's version
  CALL :runCmd "node_modules\.bin\grunt setConfigVer:selendroid"
  ECHO.
  ECHO =====Reset Selendroid Complete=====
)
:: Reset Gappium
IF %pigsFly% == 1 (
  ECHO.
  ECHO =====Resetting Gappium=====
  ECHO.
  ECHO Clearing out old links
  CALL :runCmd "RD /S /Q sample-code\apps\io.appium.gappium.sampleapp | VER > NUL"
  ECHO Cloning/updating Gappium
  CALL :runCmd "git submodule update --init submodules\io.appium.gappium.sampleapp"
  CALL :runCmd "PUSHD submodules\io.appium.gappium.sampleapp"
  ECHO Building Gappium test app
  CALL :runCmd "reset.bat"
  CALL :runCmd "POPD"
  ECHO Linking Gappium test app
  CALL :runCmd "XCOPY submodules\io.appium.gappium.sampleapp sample-code\apps\io.appium.gappium.sampleapp /E /Q"
  ECHO.
  ECHO =====Reset Gappium=====
)
ECHO Done, No Errors
GOTO :EOF

:: Function to uninstall an Android app
:uninstallAndroidApp
  ECHO Attempting to uninstall android app %~1
  FOR /F "delims=" %%i in ('adb devices ^| FINDSTR /R "device$" ^| find /v /c ""') DO SET deviceCount=%%i
  IF %deviceCount% GEQ 1 (
    GOTO :deviceExists
  ) ELSE ECHO No android devices detected, skipping uninstallation
GOTO :EOF

:deviceExists
IF DEFINED udid (
  GOTO :udidSpecified
) ELSE IF %deviceCount% EQU 1 (
  CALL :runCmd "adb uninstall %~1 | VER > NUL"
) ELSE ECHO More than one device present, but no device serial provided, skipping uninstallation (use --udid)
GOTO :EOF

:udidSpecified
FOR /F "delims=" %%i in ('adb devices ^| FINDSTR /R "^%udid%" ^| find /v /c ""') DO SET specifiedDeviceCount=%%i
IF %specifiedDeviceCount% EQU 1 (
  CALL :runCmd "adb -s %udid% uninstall %~1 | VER > NUL"
) ELSE ECHO Device with serial %udid% not found, skipping installation
GOTO :EOF

:: Function to run commands
:runCmd - function to run a command
  IF %doVerbose% == 1 ECHO %~1
  CALL %~1
  IF %ERRORLEVEL% NEQ 0 IF %doForce% == 0 (
    CD /D %curpath%
    ECHO.
    ECHO Stopping because there was an error and --force was not used
    CALL :halt 1
  )
GOTO :EOF

:: Sets the errorlevel and stops the batch immediately
:halt
CALL :__SetErrorLevel %1
CALL :__ErrorExit 2> NUL
GOTO :EOF

:__ErrorExit
REM Creates a syntax error, stops immediately
()
GOTO :EOF

:__SetErrorLevel
EXIT /B %TIME:~-2%
GOTO :EOF
