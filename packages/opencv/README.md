# @appium/opencv

> OpenCV-related helper methods

[![NPM version](http://img.shields.io/npm/v/@appium/opencv.svg)](https://npmjs.org/package/@appium/opencv)
[![Downloads](http://img.shields.io/npm/dm/@appium/opencv.svg)](https://npmjs.org/package/@appium/opencv)

## Installation

`npm install @appium/opencv`

## Usage

### initOpenCv

Loads the opencv bindings. You only need to explicitly call this if you want to use your own opencv
methods that are not included in this module.

```js
import {initOpenCv} from '@appium/opencv';
await initOpenCv();
```

### getImagesMatches

Calculates the count of common edges between two images. The images might be rotated or resized
relatively to each other. See the function definition for more details.

```js
import {getImagesMatches} from '@appium/opencv';
import {fs} from '@appium/support';

const image1 = await fs.readFile('image1.jpg')
const image2 = await fs.readFile('image2.jpg')
const {points1, rect1, points2, rect2, totalCount, count} = await getImagesMatches(image1, image2);
```

### getImagesSimilarity

Calculates the similarity score between two images. It is expected that both images have the same
resolution. See the function definition for more details.

```js
import {getImagesSimilarity} from '@appium/opencv';
import {fs} from '@appium/support';

const image1 = await fs.readFile('image1.jpg')
const image2 = await fs.readFile('image2.jpg')
const {score} = await getImagesSimilarity(image1, image2);
```

### getImageOccurrence

Calculates the occurrence position of a partial image in the full image. See the function definition
for more details.

```js
import {getImageOccurrence} from '@appium/opencv';
import {fs} from '@appium/support';

const fullImage = await fs.readFile('image1.jpg')
const partialImage = await fs.readFile('image2.jpg')
const {rect, score} = await getImageOccurrence(fullImage, partialImage);
```

## License

Apache-2.0
