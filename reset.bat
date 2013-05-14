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
call grunt configAndroidBootstrap
echo.
echo gruntbuildAndroidBootstrap
call grunt buildAndroidBootstrap
echo.
echo grunt setConfigVer:android
call grunt setConfigVer:android
echo.
echo =====Reset Complete=====