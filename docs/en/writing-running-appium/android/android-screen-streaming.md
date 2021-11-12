## Android Device Screen Streaming With Appium

Since Appium 1.16 there is a possibility to stream the screen of the device under test to one or more remote clients. The currently displayed content is broadcasted as configurable [MJPEG](https://en.wikipedia.org/wiki/Motion_JPEG) stream over http protocol. This allows to observe automated test execution while it is running and catch possible issues earlier. Single MJPEG server supports multiple simultaneous clients that can receive screen updates at the same time. The framerate there depends on the server and device performance, but is close to the real time one and can reach up to 60 frames per second, especially with properly adjusted bitrate and/or scaled screen dimensions.


### mobile: startScreenStreaming

Starts streaming of the device's screen. The streaming can only be started if all the requirements are met:
- [GStreamer](https://gstreamer.freedesktop.org/) binaries are installed on the server machine. For example, it can be installed using the following command on Mac OS: `brew install gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly gst-libav`
- The device under test has `screenrecord` utility available and the utility supports `--output-format=h264` option. Emulators only have this utility since API 27.
- The `adb_screen_streaming` [server feature](https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/security.md) is enabled.

The command initializes low-level streaming with adb, pipes it to GStreamer pipeline, which converts h264-encoded frames into JPEG images and sends them to a TCP socket. At the end of this sequence there is Node.js http server, which wraps the TCP stream into HTTP protocol, so the video can be viewed with a normal browser.
In case the streaming is already running the command just returns silently. Simultaneous streaming on multiple ports/with different configs is not supported. It is necessary to stop the current stream before starting a new one.

#### Supported arguments

 * _width_: The desired width of the resulting images. This is set to the actual width of the device's screen if unset. The output stream is going to be scaled if the `width` value is less than the original one. It is recommended to keep the original scale while setting a custom width/height.
 * _height_: The desired height of the resulting images. This is set to the actual height of the device's screen if unset. The output stream is going to be scaled if the `height` value is less than the original one. It is recommended to keep the original scale while setting a custom width/height.
 * _bitRate_: The bit rate of the original h264-encoded video stream. By default it equals to 4000000 bit/s. It is recommended to set it to lower values if you observe serious frame drop in the resulting MJPEG video.
 * _host_: The IP address/host name to start the HTTP MJPEG server on. You can set it to `0.0.0.0` to trigger the broadcast on all available network interfaces. `127.0.0.1` by default.
 * _port_: The port number to start the HTTP MJPEG server on. `8093` by default.
 * _pathname_: The HTTP request path the MJPEG server should be available on. If unset then any pathname on the given `host`/`port` combination will work. Note that the value should always start with a single slash: `/`
 * _tcpPort_: The port number to start the internal TCP MJPEG broadcast on. This type of broadcast always starts on the loopback interface (`127.0.0.1`). `8094` by default.
 * _quality_: The quality value for the streamed JPEG images. This number should be in range [1, 100], where 100 is the best quality. `70` by default.
 * _considerRotation_: If set to `true` then GStreamer pipeline will increase the dimensions of the resulting images to properly fit images in both landscape and portrait orientations. Set it to `true` if the device rotation is not going to be the same during the broadcasting session. `false` by default.
 * _logPipelineDetails_: Whether to log GStreamer pipeline events into the standard log output. Might be useful for debugging purposes. `false` by default.

#### Usage examples

```java
// Java
Map<String, Object> args = new HashMap<>();
args.put("width", 1080);
args.put("height", 1920);
args.put("considerRotation", true);
args.put("quality", 45);
args.put("bitRate", 500000);
driver.executeScript("mobile: startScreenStreaming", args);
```

```python
# Python
driver.execute_script('mobile: startScreenStreaming', {
    'width': 1080,
    'height': 1920,
    'considerRotation': True,
    'quality': 45,
    'bitRate': 500000,
})
```

```javascript
// Javascript
driver.execute('mobile: startScreenStreaming', {
    'width': 1080,
    'height': 1920,
    'considerRotation': true,
    'quality': 45,
    'bitRate': 500000,
})
```

### mobile: stopScreenStreaming

Stops the running screen streaming session. If no session has been started before then no action is done. Note that screen streaming session is always stopped automatically as soon as the container driver session is terminated.

#### Usage examples

```java
// Java
driver.executeScript("mobile: stopScreenStreaming");
```

```python
# Python
driver.execute_script('mobile: stopScreenStreaming')
```

```javascript
// Javascript
driver.execute('mobile: stopScreenStreaming')
```
