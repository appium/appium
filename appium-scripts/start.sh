#!/bin/bash

# It is workaround to access adb from androidusr
echo "Prepare adb to have access to device"
sudo /opt/android/platform-tools/adb devices >/dev/null
sudo chown -R 1300:1301 .android
echo "adb can be used now"

# Connect device via wireless
if [ "${REMOTE_ADB}" = true ]; then
	echo "Connect device via wireless"
	# Avoid lost connection
	${APP_PATH}/wireless_autoconnect.sh && \
	${APP_PATH}/wireless_connect.sh
fi

# Command to start Appium
APPIUM_LOG="${APPIUM_LOG:-/var/log/appium.log}"
command="xvfb-run appium --log $APPIUM_LOG"

# Adding Selenium configurations if needed
if [ "${CONNECT_TO_GRID}" = true ]; then
	NODE_CONFIG_JSON="${APP_PATH}/nodeconfig.json"
	if [ "${CUSTOM_NODE_CONFIG}" != true ]; then
		${APP_PATH}/generate_selenium_config.sh ${NODE_CONFIG_JSON}
	fi
	command+=" --nodeconfig ${NODE_CONFIG_JSON}"
fi

if [ "${DEFAULT_CAPABILITIES}" = true ]; then
	DEFAULT_CAPABILITIES_JSON="${APP_PATH}/defaultcapabilities.json"
	command+=" --default-capabilities ${DEFAULT_CAPABILITIES_JSON}"
fi

# Adding additional Appium configuration if needed
command+=" ${APPIUM_ADDITIONAL_PARAMS}"

# Run the whole command
pkill -x xvfb-run
rm -rf /tmp/.X99-lock
${command}