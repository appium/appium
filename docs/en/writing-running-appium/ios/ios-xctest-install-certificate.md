## Automating Installation of Self-Signed Certificate on iOS

Unfortunately, Apple does not provide any command line options which can help to install self-signed certificate on a real device or Simulator. However, there is [over-the-air](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/iPhoneOTAConfiguration/Introduction/Introduction.html) enrollment technology, which allows the deployment of several entity types, including such certificates, by simply downloading specially prepared configuration files with the built-in web browser. After the configuration is downloaded it can be installed and trusted by going through several simple wizard steps.


- [mobile: installCertificate](https://github.com/appium/appium-xcuitest-driver#mobile-installcertificate)
