# Roadmap

This is not a traditional roadmap. We don't have a typical product team with a typical product
manager. The fact that the items below exist on a roadmap is no indication that we will ever have
the opportunity to work on them. Instead this is more like a wishlist of outcomes that the project
thinks would be valuable. If and when we get additional contributions of development work, this is
a set of items that would be great for someone to work on! Ideally, interested devs would find
something on this list and own it from start to finish! Let anyone on the project know if you're
interested and we can help get you going.

### Core projects
- **WebDriver BiDi support in the Appium server**: the WebDriver BiDi spec is underway, which details a different method for communicating with drivers. We should implement handling for these methods in our server so that Appium drivers can take advantage of the BiDi spec without additional work on their part.
- **Redevelop automatically generated command docs**: due to changing TypeDoc support and the departure of one of our team, we were forced to remove our TypeDoc-based automatic docs generation tool. It would be nice to bring this back in a more maintainable form!

### Driver/platform-specific projects
- **Better maintenance for our Android drivers**: we're looking for Android specialists to help maintain our Android drivers (UiAutomator2 and Espresso)
- **Better maintenance for our iOS driver**: we're looking for iOS specialists to help maintain our XCUITest driver
- **Better maintenance for [appium-ios-device](https://github.com/appium/appium-ios-device)**: this project is using outdated approaches and libraries. If it could be improved it would have a big impact on the performance of the XCUITest driver

### Client library projects
- **Selenium compatibility client updates**: we'd like to rearchitect our flagship Appium clients to extend rather than wrap Selenium clients, reducing the overall surface area of the Appium clients and making them work more closely with existing Selenium client functionality.

### Appium Inspector projects
- **Full support for web inspection**: currently the Appium Inspector has poor to no support for inspecing web pages (either mobile browsers or web content embedded in webviews). It's a common requirement to inspect web elements as part of writing Appium tests, and at the present time users are required to leave the Inspector and open up a browser's devtools.
- **Record/Playback**: we have a basic record-to-code feature already. It would be nice to be able to save recorded steps and play them back with a little player/editor.
- **Support for more platforms**: currently there is a fair bit of specialized handling for iOS and Android in the Appium inspector. Other platforms either work poorly or not at all with the Inspector. It would be great to establish a way for drivers to report all the information about how they work to the Inspector, so it can support any platform without needing special-cased code for it.
- **Locator analysis and comparison**: it would be nice for users to get more information about the relative suitability of using different locators to find elements, as poor locator performance is a leading cause of Appium test instability.
- **Dark theme**: for true hackers!
- **Export/import of saved gestures**: it's currently not possible to port your saved gestures to other instances of the Inspector (i.e., to share with team members).
- **Bulk export/import saved sessions**: would be nice to take your sessions and capabilities with you or to share with colleagues.
