## Automating Installation of Self-Signed Certificate on iOS

Unfortunately, Apple does not provide any command line options which can help to install self-signed certificate on a real device or Simulator. However, there is [over-the-air](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/iPhoneOTAConfiguration/Introduction/Introduction.html) enrollment technology, which allows the deployment of several entity types, including such certificates, by simply downloading specially prepared configuration files with the built-in web browser. After the configuration is downloaded it can be installed and trusted by going through several simple wizard steps.


### mobile: installCertificate

This command receives the content of an existing certificate in PEM format, transforms the content to a special config format and deploys it on Appium's built-in HTTP server, so the config can be downloaded and accepted on the device under test. Thus the main requirement is that the hostname and port, where Appium server is running, are reachable on the device under test. After the certificate is installed the script is going to open System Preferences again and enable it inside Certificate Trust Settings if it is disabled.

#### Supported arguments

 * _content_: The content of the certificate represented as base64-encoded string. The parameter is mandatory

#### Usage examples

```java
// Java
Map<String, Object> args = new HashMap<>();
byte[] byteContent = Files.readAllBytes(new File("custom.cer").toPath());
args.put("content", Base64.getEncoder().encodeToString(byteContent));
driver.executeScript("mobile: installCertificate", args);
```
