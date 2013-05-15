@echo off
:: go to directory containing batch file
for /f %%i in ("%0") do set curpath=%%~dpi
cd /d %curpath%

:: Install Package and Dependencies
echo.
echo npm install .
call npm install .

:: Reset Android
echo.
echo =====Resetting Android=====
echo.
echo grunt configAndroidBootstrap
call node_modules\.bin\grunt configAndroidBootstrap
echo.
echo gruntbuildAndroidBootstrap
call node_modules\.bin\grunt buildAndroidBootstrap
echo.
echo grunt setConfigVer:android
call node_modules\.bin\grunt setConfigVer:android
echo.
echo =====Reset Complete=====