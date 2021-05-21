## Automating Performance Metrics Measurement

Apple provides the `instruments` tool with quite a rich set of features for desktop and mobile applications performance measurement. The collected data can be then visualized with `Instruments.app`, which is a part of Xcode DevTools. By default Xcode provides several measurement templates, like `Activity Monitor` or `Time Profiler`, but one can also create their own profiles and select a custom set of metrics to record and visualize. Read https://developer.apple.com/library/content/documentation/DeveloperTools/Conceptual/InstrumentsUserGuide to get a more detailed overwiew of available tool features.

- [mobile: startPerfRecord](https://github.com/appium/appium-xcuitest-driver#mobile-startperfrecord)
- [mobile: stopPerfRecord](https://github.com/appium/appium-xcuitest-driver#mobile-stopperfrecord)
