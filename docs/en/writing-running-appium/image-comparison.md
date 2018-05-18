# Image Comparison Features

This article describes the set of image comparison features available in Appium. These features are available in all drivers and require OpenCV 3 native libs. Also, each feature is able to visualize the comparison result, so you can always track what is going on under the hood to select optimal matching parameters to achieve the best comparison results.


## Prerequisites

- OpenCV 3+ native libraries
- [opencv4nodejs](https://github.com/justadudewhohacks/opencv4nodejs) npm module: `npm i -g opencv4nodejs`. By default the preinstall script of this module also downloads and makes all the required OpenCV libs from source, but this requires developer tools to be available on the host system.
- Appium Server 1.8.0+


## Purpose

Image comparison might be handy for many automation tasks. For example:
- It is necessary to figure out whether the given picture example is present on the screen
- It is necessary to calculate coordinates of some predefined on-screen object
- It is necessary to verify whether the current on-screen object state is similar to the expected state


## Feature-based Comparison

Performs images matching by template to find possible occurrence of the partial image in the full image. Read https://docs.opencv.org/3.0-beta/doc/py_tutorials/py_feature2d/py_matcher/py_matcher.html for more details on this topic. Such comparison is useful in case the resulting image is rotated/scaled in comparison to the original one.

### Example

```java
// java

byte[] screenshot = Base64.encodeBase64(driver.getScreenshotAs(OutputType.BYTES));
FeaturesMatchingResult result = driver
        .matchImagesFeatures(screenshot, originalImg, new FeaturesMatchingOptions()
                .withDetectorName(FeatureDetector.ORB)
                .withGoodMatchesFactor(40)
                .withMatchFunc(MatchingFunction.BRUTE_FORCE_HAMMING)
                .withEnabledVisualization());
assertThat(result.getVisualization().length, is(greaterThan(0)));
assertThat(result.getCount(), is(greaterThan(0)));
assertThat(result.getTotalCount(), is(greaterThan(0)));
assertFalse(result.getPoints1().isEmpty());
assertNotNull(result.getRect1());
assertFalse(result.getPoints2().isEmpty());
assertNotNull(result.getRect2());
```

All the `FeaturesMatchingOptions` builder methods above contain detailed descriptions in their docstrings.

### Visualization Example

![Feature-Based Comparison Example](https://user-images.githubusercontent.com/7767781/38800997-f7408fb8-4168-11e8-93b9-cfe3d51ecf1c.png)


## Occurrences Lookup

Performs images matching by template to find possible occurrence of the partial image in the full image. Read https://docs.opencv.org/2.4/doc/tutorials/imgproc/histograms/template_matching/template_matching.html for more details on this topic. Such comparison is useful in case the full image is a superset of the partial image.

### Example

```java
// java

byte[] screenshot = Base64.encodeBase64(driver.getScreenshotAs(OutputType.BYTES));
OccurrenceMatchingResult result = driver
        .findImageOccurrence(screenshot, partialImage, new OccurrenceMatchingOptions()
                .withEnabledVisualization());
assertThat(result.getVisualization().length, is(greaterThan(0)));
assertNotNull(result.getRect());
```

All the `OccurrenceMatchingOptions` builder methods above contain detailed descriptions in their docstrings.

### Visualization Example

![Occurrences Lookup](https://user-images.githubusercontent.com/7767781/40233298-b7decfe4-5aa2-11e8-8c9b-f85f384d2092.png)

The highlighted picture at the left bottom corner is the resulting match of ![Waldo](https://github.com/appium/appium-support/blob/master/test/images/waldo.jpg?raw=true) lookup.

## Similarity Calculation

Performs images matching to calculate the similarity score between them. The flow there is similar to the one used in `findImageOccurrence`, but it is mandatory that both images are of equal size. Such comparison is useful in case the original image is a copy of the original one, but with changed content.

### Example

```java
// java

byte[] screenshot1 = Base64.encodeBase64(driver.getScreenshotAs(OutputType.BYTES));
byte[] screenshot2 = Base64.encodeBase64(driver.getScreenshotAs(OutputType.BYTES));
SimilarityMatchingResult result = driver
        .getImagesSimilarity(screenshot1, screenshot2, new SimilarityMatchingOptions()
                .withEnabledVisualization());
assertThat(result.getVisualization().length, is(greaterThan(0)));
assertThat(result.getScore(), is(greaterThan(0.0)));
```

All the `SimilarityMatchingOptions` builder methods above contain detailed descriptions in their docstrings.

### Visualization Example

![Similarity Matching Example](https://user-images.githubusercontent.com/7767781/38780635-27198346-40da-11e8-803d-1ec4afd3c3aa.png)

The similarity score for two pictures above is ~0.98.
