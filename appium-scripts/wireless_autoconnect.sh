#!/bin/bash

if [ ! -z "${REMOTE_ADB}" ]; then

	if [ -z "${REMOTE_ADB_POLLING_SEC}" ]; then
		REMOTE_ADB_POLLING_SEC=5
	fi

	function connect() {
		while true; do
			#to avoid immediate run
			sleep ${REMOTE_ADB_POLLING_SEC}
			${APP_PATH}/wireless_connect.sh
		done
	}

    ( trap "true" HUP ; connect ) >/dev/null 2>/dev/null </dev/null & disown

fi