
#!/bin/bash

if [ ! -z "${ANDROID_DEVICES}" ]; then
	IFS=',' read -r -a array <<<"${ANDROID_DEVICES}"
	for i in "${!array[@]}"; do
		array_device=$(echo ${array[$i]} | tr -d " ")
		#string contains check
		if [[ ${connected_devices} != *${array_device}* ]]; then
			echo "Connecting to: ${array_device}"
			adb connect ${array_device} >/dev/null 2>/dev/null
			#Give time to finish connection
			sleep 2
			adb devices
			echo "Success!"
		fi
	done
fi
