## Finding and Interacting with Image Elements

Using the experimental `-image` locator strategy, it is possible to send an Appium an image file representing an element you want to tap. If Appium can find a screen region matching your template, it will wrap up information about this region as a standard `WebElement` and send it back to your Appium client.

The strategy will be made available differently for each Appium client, for example: `driver.findElementByImage()`.

### Image Selectors

In conjunction with any locator strategy, you need to use a "selector" which details the specific nature of your find request. In the case of the `-image` strategy, the selector must be a string which is a base64-encoded image file representing the template you want to use for matching.

### Image Elements

If the image match is successful, Appium will cache information about the match and create a standard response for your client to consume, resulting in the instantiation of a standard element object in your test script. Using this element object, you are able to call a small number of methods on the "Image Element", as if it were a bona-fide `WebElement`:

* `click`
* `isDisplayed`
* `getSize`
* `getLocation`
* `getLocationInView`
* `getElementRect`
* `getAttribute`
    * `visible` returns matched image as base64 data when `getMatchedImageResult` is `true`
    * `score` returns the similarity score as a float number in range `[0.0, 1.0]` sine Appium 1.18.0

These actions are supported on "Image Elements" because they are the actions which involve only use of screen position for their functioning. Other actions (like `sendKeys`, for example) are not supported, because all Appium can know based on your template image is whether or not there is a screen region which visually matches it--Appium has no way of turning that information into a driver-specific UI element object, which would be necessary for the use of other actions.

It's important to keep this important point in mind: there is nothing "magic" about Image Elements---they merely reference screen coordinates, and thus "tapping" an Image Element is internally nothing more than Appium constructing a tap at a point in the center of the Image Element's screen bounds (and in fact you can tell Appium which API to use to perform that tap---see below).

### Related Settings

Because finding elements by image relies on image analysis software in conjunction with Appium's screenshot functionality and the reference images you yourself provide, we provide a number of settings that help you modulate this feature, in some cases potentially speeding up the match or making it more accurate.

To access these settings, you should use the Appium [Settings API](/docs/en/advanced-concepts/settings.md). These are the settings that are available:

|Setting Name|Description|Possible Values|Default Value|
|------------|-----------|---------------|-------------|
|imageMatchThreshold|The OpenCV match threshold below which to consider the find a failure. Basically the range of possibilities is between 0 (which means no threshold should be used) and 1 (which means that the reference image must be an exact pixel-for-pixel match). The exact values in between have no absolute meaning. For example a match that requires drastic resizing of a reference image will come out as a lower match strength than otherwise. It's recommended you try the default setting, and then incrementally lower the threshold if you're not finding matching elements. If you're matching the wrong element, try increasing the threshold value.|Numbers from 0 to 1|0.4|
|fixImageFindScreenshotDims|Appium knows the screen dimensions, and ultimately these are the dimensions which are relevant for deciding where to tap on the screen. If the screenshot retrieved (via Appium's native methods, or an external source) does not match the screen dimensions, this setting dictates that Appium will adjust the size of the screenshot to match, ensuring that matched elements are found at the correct coordinates. Turn this setting off if you know it's not necessary, and Appium will forego the check, potentially speeding things up a bit.|`true` or `false`|`true`|
|fixImageTemplateSize|OpenCV will not allow the matching of a reference image / template if that image is larger than the base image to match against. It can happen that the reference image you send in has dimensions which are larger than the screenshot Appium retrieves. In this case the match will automatically fail. If you set this setting to `true`, Appium will resize the template to ensure it is at least smaller than the size of the screenshot.|`true` or `false`|`false`|
|fixImageTemplateScale| Appium resizes a base image to fit its window size before matching them with OpenCV. If you set this setting to `true`, Appium scales a reference image you send in as the same scale Appium scales the base image to fit the window size. e.g. iOS screenshot is `750 × 1334` pixels base image. The window size is `375 x 667`. Appium rescale the base image to window size scaling it with `0.5`. A reference image is based on the screenshot size, never the image matches with the window size scale. This settings allow Appium to scale the reference image with `0.5`. [appium-base-driver#306](https://github.com/appium/appium-base-driver/pull/306)| `true` or `false` | `false` |
|defaultImageTemplateScale| Appium does not resize template images by default (the value of 1.0). Although, storing scaled template images might help to save size of the storage. E.g. One has could represent 1080 × 126 pixels area by 270 × 32 pixels template image (the value of defaultImageTemplateScale is expected to be set to 4.0). Check [appium-base-driver#307](https://github.com/appium/appium-base-driver/pull/307) for more details. |e.g., `0.5`, `10.0`, `100`| `1.0` |
|checkForImageElementStaleness|It can happen that, in between the time you have matched an image element and the time you choose to tap on it, the element is no longer present. The only way for Appium to determine this is to attempt to re-match the template immediately before tapping. If that re-match fails, you will get a `StaleElementException`, as you would expect. Turn this to `false` to skip the check, potentially speeding things up, but potentially running into stale element issues without the benefit of an exception to let you know you did.|`true` or `false`|`true`|
|autoUpdateImageElementPosition|It can happen that a matched image changes position in between the time it is found and the time you tap on it. As with the previous setting, Appium can automatically adjust its position if it determines in a re-match that the position changed.|`true` or `false`|`false`|
|imageElementTapStrategy|In order to tap on a found image element, Appium has to use one of its touch action strategies. The available strategies are the W3C Actions API, or the older MJSONWP TouchActions API. Stick to the default unless the driver you are using does not support the W3C Actions API for some reason.|`"w3cActions"` or `"touchActions"`|`"w3cActions"`|
|getMatchedImageResult| Appium does not store the matched image result. Although, storing the result in memory might help for debugging whether which area is matched by find by image. Appium returns the image against [attribute](http://appium.io/docs/en/commands/element/attributes/attribute/) API as `visual`. | `true` or `false` | `false` |

Note that each language-specific Appium client may make these settings available via special constants which could differ slightly from the exact setting names mentioned above.

### Debug

`getMatchedImageResult` might help for debugging if Appium found the provided image expectedly. `visual` attribute returns base64 data if `getMatchedImageResult` is `true`.

```ruby
# Ruby core
@driver.update_settings({ getMatchedImageResult: true })
el = @driver.find_element_by_image 'path/to/img.ong'
img_el.visual # returns base64 encoded string
```

```python
# Python
self.driver.update_settings({"getMatchedImageResult": True})
el = self.driver.find_element_by_image('path/to/img.ong')
el.get_attribute('visual') # returns base64 encoded string
```

reference: https://github.com/appium/appium-base-driver/pull/327
