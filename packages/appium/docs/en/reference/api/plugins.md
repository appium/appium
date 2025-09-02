---
title: Plugin Endpoints
---
<style>
  ul[data-md-component="toc"] .md-nav .md-nav {
    display: none;
  }
</style>

This page lists the endpoints added or modified by official plugins.

## Execute Driver Plugin

### `executeDriverScript`

```
POST /session/:sessionId/appium/execute_driver
```

Executes a driver script in a child process.

#### Parameters

|Name|Description|Type|Default|
|--|--|--|--|
|`script`|Script to be executed|string||
|`type?`|Name of the library executing the script|string|`webdriverio`|
|`timeout?`|Timeout (in milliseconds) for the script process|number|`3600000`|

#### Response

`RunScriptResult` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`result`|Result returned by the script|any|
|`logs`|Logs generated during script execution|object|

## Images Plugin

### `compareImages`

```
POST /session/:sessionId/appium/compare_images
```

Compares two images using the specified mode of comparison:

* `matchFeatures`: whether `firstImage` is a rotated, scaled, or otherwise modified version of `secondImage`
* `matchTemplate`: whether `firstImage` contains one or more occurrences of `secondImage`
* `getSimilarity`: calculate similarity score between two images of equal size

#### Parameters

|<div style="width:7em">Name</div>|Description|Type|Default|
|--|--|--|--|
|`mode`|Mode of comparison. Supported values are: `matchFeatures`, `getSimilarity`, or `matchTemplate`.|string||
|`firstImage`|Base64-encoded image file|string or Buffer||
|`secondImage`|Base64-encoded image file|string or Buffer||
|`options?`|Options specific to the `mode` value (see below)|object|`{}`|

**`options` for `mode=matchFeatures`**

|<div style="width:10em">Name</div>|Description|Type|<div style="width:6em">Default</div>|
|--|--|--|--|
|`detectorName?`|Name of the OpenCV feature detector to use. Supported values are: `AKAZE`, `AgastFeatureDetector`, `BRISK`, `FastFeatureDetector`, `GFTTDetector`, `KAZE`, `MSER`, or `ORB`.|string|`ORB`|
|`goodMatchesFactor?`|Maximum number of 'good' matches; or a function accepting current distance, min distance and max distance, and returning a boolean indicating whether the match should be included or not.|number or function||
|`matchFunc?`|Name of the OpenCV descriptor matcher to use. Supported values are: `FlannBased`, `BruteForce`, `BruteForce-L1`, `BruteForce-Hamming`, `BruteForce-HammingLUT`, or `BruteForce-SL2`.|string|`BruteForce`|
|`visualize?`|Whether to include an image of the matcher visualization in the response|boolean|`false`|

**`options` for `mode=matchTemplate`**

|<div style="width:13em">Name</div>|Description|Type|<div style="width:9em">Default</div>|
|--|--|--|--|
|`matchNeighbourThreshold?`|Maximum pixel distance between two matches to consider them the same match|number|`10`|
|`method?`|Name of the OpenCV template matching method to use. Supported values are: `TM_CCOEFF`, `TM_CCOEFF_NORMED`, `TM_CCORR`, `TM_CCORR_NORMED`, `TM_SQDIFF`, or `TM_SQDIFF_NORMED`.|string|`TM_CCOEFF_NORMED`|
|`multiple?`|Whether to look for multiple occurrences of the image|boolean|`false`|
|`threshold?`|Threshold to use for accepting/rejecting a match|number|`0.5`|
|`visualize?`|Whether to include an image of the matcher visualization in the response|boolean|`false`|

**`options` for `mode=getSimilarity`**

|<div style="width:6em">Name</div>|Description|Type|<div style="width:9em">Default</div>|
|--|--|--|--|
|`method?`|Name of the OpenCV template matching method to use. Supported values are: `TM_CCOEFF`, `TM_CCOEFF_NORMED`, `TM_CCORR`, `TM_CCORR_NORMED`, `TM_SQDIFF`, or `TM_SQDIFF_NORMED`.|string|`TM_CCOEFF_NORMED`|
|`visualize?`|Whether to include an image of the matcher visualization in the response|boolean|`false`|

#### Response

`ComparisonResult` - an object whose properties depend on the `mode` input parameter:

**`ComparisonResult` for `mode=matchFeatures`**

|<div style="width:8em">Name</div>|Description|Type|
|--|--|--|
|`count`|Number of matched edges on both images, after applying `goodMatchesFactor` (if specified).|number|
|`points1`|Array of matching points on `firstImage`|`{x, y}[]`|
|`points2`|Array of matching points on `secondImage`|`{x, y}[]`|
|`rect1`|Bounding rectangle for `points1`|`{x, y, width, height}`|
|`rect2`|Bounding rectangle for `points2`|`{x, y, width, height}`|
|`totalCount`|Total number of matched edges on both images, before applying `goodMatchesFactor` (if specified)|number|
|`visualization?`|Image of the matcher visualization. Only included if the `visualize` input option was enabled.|Buffer|

**`ComparisonResult` for `mode=matchTemplate`**

|<div style="width:8em">Name</div>|Description|Type|
|--|--|--|
|`rect`|Region of `firstImage` where a match was found for `secondImage`|`{x, y, width, height}`|
|`multiple?`|Array of all comparison results. Only included if the `multiple` input option was enabled.|`{rect, score, visualization?}`|
|`score`|Similarity score between both images in the range `[0.0, 1.0]`|number|
|`visualization?`|Image of the matcher visualization. Only included if the `visualize` input option was enabled.|Buffer|

**`ComparisonResult` for `mode=getSimilarity`**

|<div style="width:8em">Name</div>|Description|Type|
|--|--|--|
|`score`|Similarity score between both images in the range `[0.0, 1.0]`|number|
|`visualization?`|Image of the matcher visualization. Only included if the `visualize` input option was enabled.|Buffer|

### `findElement`

```
POST /session/:sessionId/element
```

Modifies the [`findElement`](./webdriver.md#findelement) endpoint:

* Adds `-image` to the supported values for the `using` parameter (the location strategy)

### `findElements`

```
POST /session/:sessionId/elements
```

Modifies the [`findElements`](./webdriver.md#findelements) endpoint:

* Adds `-image` to the supported values for the `using` parameter (the location strategy)

### `performActions`

```
POST /session/:sessionId/actions
```

Modifies the `performActions` endpoint:

* If any action in `actions` includes `origin`, whose value is an image element:
    * Removes the `origin` property
    * Increments the `x` and `y` properties by the center coordinates of the image element

## Relaxed Caps Plugin

### `createSession`

```
POST /session
```

Modifies the [`createSession](./webdriver.md#createsession) endpoint:

* Adds the `appium:` prefix to all keys in `capabilities`, unless they match a standard W3C
  capability, or already have any prefix

## Storage Plugin

!!! tip

    All endpoints for this plugin can be invoked without creating a session, allowing you to prepare
    your test environment in advance.

### `addStorageItem`

```
POST /storage/add
```

Adds a new file to the storage.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`name`|Name used for saving the file (must not include path separator characters)|string|
|`sha1`|SHA1 hash of the file to be uploaded|string|

#### Response

`AddRequestResult` - an object with the following properties:

|Name|Description|Type|
|--|--|--|
|`ttlMs`|Timeout (in milliseconds) for both web sockets to remain active, or for a file payload to be successfully uploaded|number|
|`ws.events`|Path for the events web socket used to notify about upload success or failure|string|
|`ws.stream`|Path for the streaming web socket used to upload the file content|string|

Example:
```json
{
  "ws": {
    "stream": "/storage/add/ccc963411b2621335657963322890305ebe96186/stream",
    "events": "/storage/add/ccc963411b2621335657963322890305ebe96186/events"
  },
  "ttlMs": 300000
}
```

### `deleteStorageItem`

```
POST /storage/delete
```

Deletes a file in the storage.

#### Parameters

|Name|Description|Type|
|--|--|--|
|`name`|Name of the file to be deleted|string|

#### Response

`boolean` - `true` upon successful file deletion, or `false` if the file does not exist in
the storage 

### `listStorageItems`

```
GET /storage/list
```

List all files present in the storage.

#### Response

`List<StorageItem>` - a list of items, where each item has the following properties:

|Name|Description|Type|
|--|--|--|
|`name`|Name of the file in the storage|string|
|`path`|Full path to the file on the remote file system|string|
|`size`|File size in bytes|number|

### `resetStorage`

```
POST /storage/reset
```

Deletes all uploaded files and stops any incomplete uploads.
If the [`APPIUM_STORAGE_KEEP_ALL` flag](../cli/env-vars.md) is set, all uploaded files will be
preserved, and only the incomplete uploads will be stopped.

#### Response

`void`

## Universal XML Plugin

### `findElement`

```
POST /session/:sessionId/element
```

Modifies the [`findElement`](./webdriver.md#findelement) endpoint:

* Adds support for universal node/attribute names for the `value` parameter (the selector)

### `findElements`

```
POST /session/:sessionId/elements
```

Modifies the [`findElements`](./webdriver.md#findelements) endpoint:

* Adds support for universal node/attribute names for the `value` parameter (the selector)

### `getPageSource`

```
GET /session/:sessionId/source
```

Modifies the `getPageSource` endpoint:

* After retrieving the result, translates node/attribute names to their universal names
