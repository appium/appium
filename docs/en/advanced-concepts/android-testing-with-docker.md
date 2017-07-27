## Android Tests With Docker

When time comes to run appium tests on your own CI (like Jenkins) you would probably think about using docker.
In order to run Android tests you will also need to have an emulator. Fortunately you can find official docker image that has both Appium and Android Emulator bundled inside: 
https://hub.docker.com/r/appium/appium-emulator/
 
All you need to know is just 2 simple tricks:
1. Run ADB server using `-a` switch in the docker container running emulator. ADB will listen to all connected network interfaces, so you can connect emulator from another running container
2. You will need to setup port forwarding from the container running Appium to the container running emulator. 
Appium uses a `bootstrap-port` to setup communication to the emulator and it will bind to the localhost by default.
But since emulator running in another container, you will need to bind that local `bootstrap-port` to the same port on the emulator container

Here is a sample docker compose file that does all these tricks:
```yaml
version: "2"

services:
  emulator:
    container_name: emulator
    image: appium/appium-emulator
    command: >
          bash -c "adb -a nodaemon server &
                   emulator64-arm -avd Nexus -no-boot-anim -no-window -noaudio -gpu off"

  appium:
    container_name: appium
    image: appium/appium-emulator
    privileged: true
    command: >
      bash -c "iptables -t nat -A OUTPUT -m addrtype --src-type LOCAL --dst-type LOCAL -p tcp --dport 4700 -j DNAT --to-destination $(getent hosts emulator | awk '{ print $1 }') && 
               iptables -t nat -A POSTROUTING -m addrtype --src-type LOCAL --dst-type UNICAST -j MASQUERADE &&
               sysctl -w net.ipv4.conf.all.route_localnet=1 && 
               echo "net.ipv4.conf.all.route_localnet=1" >> /etc/sysctl.conf &&
               appium --bootstrap-port 4700"
               
  app:
    container_name: app
    image: [YOUR APP IMAGE WITH TESTS]      
```

Here is a caps file for your app's image that uses this setup (notice the `remoteAdbHost` option and `server_url` which refer docker containers): 

```
[caps]
platformName = 'Android'
deviceName = 'Android Emulator'
appPackage = '[YOUR APP PACKAGE]'
appActivity = '[YOUR APP ACTIVITY]'
remoteAdbHost = 'emulator'

[appium_lib] 
server_url = "http://appium:4723/wd/hub"
```

Finally, here is how a CI script may look like:
```bash
# run emulator and appium
docker-compose up -d

# copy APK to the emulator and install
docker cp YOUR_APK emulator:/sdcard/YOUR_APK
docker exec emulator bash -c 'adb wait-for-device && adb install -r /sdcard/YOUR_APK'

# run tests (in this sample it is rspec)
docker exec -t app bash -c 'rspec'
```