## Audio Capture From iOS Simulators and Real Devices


### Client Side API

Since Appium 1.18.0 there is a possibility to record iOS audio stream and save
it to a file, which could be then retrieved on the client side.
Apple does not provide any API to directly retrieve the audio stream from a
Simulator or a real device, but it is possible to redirect that stream to
the host machine, where it could be captured.

#### mobile: startAudioRecording

Starts audio recording process on the given host audio input with the given
audio compression parameters.

#### Supported arguments

 * _audioInput_: The name of the corresponding audio input device to use for the capture, for example `:1`. The full list of capture devices could be shown using `ffmpeg -f avfoundation -list_devices true -i ""` Terminal command. This argument is mandatory.
 * _audioCodec_: The name of the audio codec. `aac` is used by default.
 * _audioBitrate_: The bitrate of the resulting audio stream. `128k` by default.
 * _audioChannels_: The count of audio channels in the resulting stream. Setting it to `1` will create a single channel (mono) audio stream. `2` by default.
 * _audioRate_: The sampling rate of the resulting audio stream. `44100` by default.
 * _timeLimit_: The maximum recording time, in seconds. The default value is `180`, the maximum value is `43200` (12 hours)
 * _forceRestart_: Whether to restart audio capture process forcefully when startRecordingAudio is called (`true`) or ignore the call until the current audio recording is completed (`false`, the default setting).

#### mobile: stopAudioRecording

Stops the audio recording process previously started by `startAudioRecording` call. The result of the method call is a base64-encoded .mp4 file containing the audio content recorded since `startAudioRecording` was called. Subsequent method calls will return the same result.
If `startAudioRecording` was not called before then an empty string is returned.

#### Usage Examples

```java
// Java
driver.executeScript("mobile: startAudioRecording", ImmutableMap.of("audioInput", ":1"));
Thread.sleep(10000);
byte[] mp4Data = Base64.getMimeDecoder()
  .decode((String) driver.executeScript("mobile: stopAudioRecording"));
try (FileOutputStream fos = new FileOutputStream("out.mp4")) {
   fos.write(mp4Data);
}
```


### Server Requirements

Appium version should be 1.18.0 or newer.

It is mandatory that the host machine has [FFMPEG](https://www.ffmpeg.org/download.html) installed and available in PATH. On macOS it could be installed via [Brew](https://brew.sh/): `brew install ffmpeg`.

macOS since version 10.15 requires applications that record Microphone audio to be explicitly enabled in System Preferences->Security & Privacy->Privacy->Microphone tab.
Make sure either FFMPEG itself or the parent Appium process (e.g. Terminal) is present in that list.

The feature is potentially unsecure, so it must be explicitly allowed
on the server side.
The feature name is `audio_record`.
See [Security](/writing-running-appium/security.md) for more details.


### Simulator Setup

The following steps are necessary to setup iOS Simulator audio capture:

* Install [Soundflower](https://github.com/mattingalls/Soundflower/releases)
* Redirect Simulator audio output to Soundflower. From the main Simulator menu select I/O->Audio Output->Soundflower (2ch)
* Run `ffmpeg -f avfoundation -list_devices true -i ""` command in Terminal to get the identifier of the `Soundflower (2ch)` device. This identifier prefixed with `:` will be then used as `audioInput` argument to `mobile: startAudioRecording` call
* Test that your setup works as expected. Run any audio playback in Simulator and execute the following command in Terminal (do not forget to replace the `-i` argument value with the one you got from the previous step): `ffmpeg -t 5 -f avfoundation -i ":1" -c:a aac -b:a 128k -ac 2 -ar 44100 -y ~/Desktop/out.mp4`. After 5 seconds there should be `out.mp4` file on your Desktop containing the recorded audio stream.


### Real Device Setup

The following steps are necessary to setup iOS Real Device audio capture:

* Connect your device to the Mac host with a cable
* Run `open -a /System/Applications/Utilities/Audio\ MIDI\ Setup.app` application
* Find your phone in the list of devices there and click `Enable` button next to it
* Run `ffmpeg -f avfoundation -list_devices true -i ""` command in Terminal and find the identifier of your device in the `AVFoundation audio devices` list. This identifier prefixed with `:` will be then used as `audioInput` argument to `mobile: startAudioRecording` call
* Test that your setup works as expected. Run any audio playback on the device and execute the following command in Terminal (do not forget to replace the `-i` argument value with the value you got from the previous step): `ffmpeg -t 5 -f avfoundation -i ":1" -c:a aac -b:a 128k -ac 2 -ar 44100 -y ~/Desktop/out.mp4`. After 5 seconds there should be `out.mp4` file on your Desktop containing the recorded audio stream.

Apple does not allow phone calls to be redirected this way. You can only record application or system sounds.


### Further Reading

* https://github.com/appium/appium-xcuitest-driver/pull/1207
* https://www.macobserver.com/tips/quick-tip/iphone-audio-input-mac/
* http://www.lorisware.com/blog/2012/04/28/recording-iphone-emulator-video-with-sound/
