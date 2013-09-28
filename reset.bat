@echo off

:: go to directory containing batch file
FOR /f %%i in ("%0") DO SET curpath=%%~dpi
cd /d %curpath%

SET doDev=0
SET doSelendroid=0
SET doAndroid=0

FOR %%A IN (%*) DO IF "%%A" == "--dev" SET doDev=1
FOR %%A IN (%*) DO IF "%%A" == "--android" SET doAndroid=1
FOR %%A IN (%*) DO IF "%%A" == "--selendroid" SET doSelendroid=1

:: Install Package and Dependencies
echo.
echo npm install .
call npm install .

::Install Dev Dependencies
if %doDev% == 1 (
  echo.
  echo npm install . --dev
  call npm install . --dev
)

::Reset Android
if %doAndroid% == 1 (
  echo.
  echo =====Resetting Android=====
  echo.
  echo grunt configAndroidBootstrap
  call node_modules\.bin\grunt configAndroidBootstrap
  echo.
  echo grunt buildAndroidBootstrap
  call node_modules\.bin\grunt buildAndroidBootstrap
  echo.
  echo grunt setConfigVer:android
  call node_modules\.bin\grunt setConfigVer:android
  echo.
  echo =====Reset Complete=====

  echo.
  echo =====Resetting Unlock.apk=====
  echo.
  call rd /S /Q build\unlock_apk
  call mkdir build\unlock_apk
  echo Building Unlock.apk
  call git submodule update --init submodules\unlock_apk
  call pushd submodules\unlock_apk
  call ant clean
  call ant debug
  call popd
  call copy submodules\unlock_apk\bin\unlock_apk-debug.apk build\unlock_apk\unlock_apk-debug.apk
  echo =====Reset Complete=====

  :: Reset Android Dev
  if %doDev% == 1 (
    echo.
    echo =====Resetting API Demos=====
    echo.
    echo Cloning/updating Android test app: ApiDemos
    call git submodule update --init submodules\ApiDemos
    call rd /S /Q sample-code\apps\ApiDemos
    call mkdir sample-code\apps\ApiDemos
    call xcopy submodules\ApiDemos sample-code\apps\ApiDemos /E /Q
    echo.
    echo grunt configAndroidApp:ApiDemos
    call node_modules\.bin\grunt configAndroidApp:ApiDemos
    echo.
    echo grunt buildAndroidApp:ApiDemos
    call node_modules\.bin\grunt buildAndroidApp:ApiDemos
  )
)

::Reset Selendroid
IF %doSelendroid% == 1 (
  echo.
  echo =====Resetting Selendroid=====
  echo.
  echo Clearing out any old modified server apks
  call rd -/S /Q %windir%\Temp\selendroid*.apk
  echo Cloning/updating selendroid
  call rd -/S /Q submodules\selendroid\selendroid-server\target
  call git submodule update --init submodules\selendroid
  call rd /S /Q selendroid
  echo Building selendroid server and supporting libraries
  echo grunt buildSelendroidServer --force
  call node_modules\.bin\grunt buildSelendroidServer --force
  echo Setting Selendroid config to Appium's version
  echo grunt setConfigVer:selendroid
  call node_modules\.bin\grunt setConfigVer:selendroid
  echo.
  echo =====Reset Complete=====
)